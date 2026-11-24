import { getSupabaseClient, isSupabaseConfigured, toValidUuid } from '../client';
import { isDemoModeEnabled, requireTenantContext } from '../tenantContext';

export type AtriumStorageBucket = 'expense-receipts' | 'bat-deliverables';

export interface StorageUploadOptions {
  bucket: AtriumStorageBucket;
  file: File;
  accountId?: string | null;
  businessId?: string | null;
  branchId?: string | null;
  prefix?: string;
}

export interface StorageUploadResult {
  success: boolean;
  storagePath?: string;
  signedUrl?: string;
  localPreviewUrl?: string;
  error?: string;
}

const BUCKET_RULES: Record<
  AtriumStorageBucket,
  { maxBytes: number; allowedMimes: Set<string>; allowedExts: Set<string> }
> = {
  'expense-receipts': {
    maxBytes: 5 * 1024 * 1024,
    allowedMimes: new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
    allowedExts: new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']),
  },
  'bat-deliverables': {
    maxBytes: 25 * 1024 * 1024,
    allowedMimes: new Set([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/tiff',
      'image/svg+xml',
      'application/postscript',
      'application/illustrator',
    ]),
    allowedExts: new Set(['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'ai', 'eps', 'svg']),
  },
};

export function validateFileForBucket(
  bucket: AtriumStorageBucket,
  file: Pick<File, 'name' | 'type' | 'size'>
): { valid: true } | { valid: false; reason: string } {
  const rules = BUCKET_RULES[bucket];
  if (file.size <= 0) {
    return { valid: false, reason: 'File is empty (0 bytes).' };
  }
  if (file.size > rules.maxBytes) {
    const maxMb = Math.round(rules.maxBytes / (1024 * 1024));
    return { valid: false, reason: `File exceeds ${maxMb} MB limit.` };
  }
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const mime = (file.type || '').toLowerCase();
  if (!rules.allowedMimes.has(mime) && !rules.allowedExts.has(ext)) {
    return {
      valid: false,
      reason: `Unsupported file type (${mime || ext || 'unknown'}).`,
    };
  }
  return { valid: true };
}

function readFileAsDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (typeof FileReader === 'undefined') {
      resolve(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || `upload_${Date.now()}`;
}

export const storageService = {
  async uploadScopedFile(opts: StorageUploadOptions): Promise<StorageUploadResult> {
    const check = validateFileForBucket(opts.bucket, opts.file);
    if (!check.valid) {
      return { success: false, error: check.reason };
    }

    const { accountId, branchId } = requireTenantContext({
      accountId: opts.accountId,
      branchId: opts.branchId,
    });
    const businessId = (opts.businessId || '').trim();
    if (!businessId) {
      return { success: false, error: 'Active business context is required for storage upload.' };
    }

    const pathAccount = toValidUuid(accountId);
    const pathBusiness = toValidUuid(businessId);
    const pathBranch = toValidUuid(branchId);
    const safePrefix = opts.prefix ? `${sanitizeFileName(opts.prefix)}_` : '';
    const storagePath = `${pathAccount}/${pathBusiness}/${pathBranch}/${safePrefix}${Date.now()}_${sanitizeFileName(opts.file.name)}`;

    const isImage =
      opts.file.type.startsWith('image/') && opts.file.type !== 'image/tiff';
    const localPreviewUrl = isImage ? await readFileAsDataUrl(opts.file) : undefined;

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      if (isDemoModeEnabled()) {
        return {
          success: true,
          storagePath,
          signedUrl: localPreviewUrl,
          localPreviewUrl,
        };
      }
      return {
        success: false,
        error: 'Supabase Storage is offline or unconfigured.',
      };
    }

    try {
      const { error: uploadError } = await (client as any).storage
        .from(opts.bucket)
        .upload(storagePath, opts.file, {
          upsert: false,
          contentType: opts.file.type || undefined,
        });

      if (uploadError) {
        return { success: false, error: uploadError.message || 'Storage upload failed.' };
      }

      const { data: signedData } = await (client as any).storage
        .from(opts.bucket)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

      return {
        success: true,
        storagePath,
        signedUrl: signedData?.signedUrl || localPreviewUrl,
        localPreviewUrl,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Storage upload failed.' };
    }
  },
};
