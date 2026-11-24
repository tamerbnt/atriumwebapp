import { getSupabaseClient, isSupabaseConfigured, toValidUuid } from '../client';
import { getActiveDeviceId } from '../syncCoordinator';

export type ServerSequenceDocType =
  | 'z_report'
  | 'walk_in_ticket'
  | 'deposit_receipt'
  | 'payroll_run'
  | 'ncr'
  | 'inspection';

export type DeviceBlockDocType = 'walk_in_ticket' | 'deposit_receipt';

export interface ServerSequenceAllocation {
  docType: ServerSequenceDocType;
  fiscalYear: number;
  seqNumber: number;
  prefix: string;
  formattedNumber: string;
}

export interface DeviceSequenceBlock {
  businessId: string;
  branchId: string;
  deviceId: string;
  docType: DeviceBlockDocType;
  fiscalYear: number;
  rangeStart: number;
  rangeEnd: number;
  nextNumber: number;
  prefix: string;
  allocatedAt: string;
}

export interface OfflineBlockAllocationResult {
  formattedNumber: string;
  seqNumber: number;
  fiscalYear: number;
  source: 'device_block' | 'server_rpc';
}

const DEVICE_BLOCKS_STORAGE_KEY = 'atrium_device_seq_blocks_v1';
const ALLOWED_DEVICE_BLOCK_TYPES = new Set<string>(['walk_in_ticket', 'deposit_receipt']);

const DOC_PREFIX: Record<string, string> = {
  z_report: 'Z',
  walk_in_ticket: 'WI',
  deposit_receipt: 'DR',
  payroll_run: 'PAY',
  ncr: 'NCR',
  inspection: 'INSP',
};

export function formatSequenceNumber(docType: ServerSequenceDocType, fiscalYear: number, seqNumber: number): string {
  const prefix = DOC_PREFIX[docType] || 'DOC';
  return `${prefix}-${fiscalYear}-${String(seqNumber).padStart(5, '0')}`;
}

export function getCachedDeviceBlocks(): DeviceSequenceBlock[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(DEVICE_BLOCKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCachedDeviceBlocks(blocks: DeviceSequenceBlock[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DEVICE_BLOCKS_STORAGE_KEY, JSON.stringify(blocks));
    }
  } catch {
    // ignore storage quota errors
  }
}

export function clearCachedDeviceBlocks(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(DEVICE_BLOCKS_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function seedLocalDeviceBlock(block: DeviceSequenceBlock): void {
  if (!ALLOWED_DEVICE_BLOCK_TYPES.has(block.docType)) {
    throw new Error(`DEVICE_BLOCK_UNSUPPORTED_DOC_TYPE: ${block.docType}`);
  }
  const existing = getCachedDeviceBlocks().filter(
    (b) =>
      !(
        b.businessId === block.businessId &&
        b.branchId === block.branchId &&
        b.deviceId === block.deviceId &&
        b.docType === block.docType &&
        b.fiscalYear === block.fiscalYear &&
        b.rangeStart === block.rangeStart
      )
  );
  existing.push(block);
  saveCachedDeviceBlocks(existing);
}

export const sequenceService = {
  /**
   * Allocates a strict gap-free sequential number on the Supabase server via
   * `allocate_sequence_number`. Never falls back to device blocks for Z-reports or fiscal docs.
   */
  async allocateServerSequence(ctx: {
    businessId: string;
    branchId: string;
    docType: ServerSequenceDocType;
    fiscalYear?: number;
  }): Promise<{ data?: ServerSequenceAllocation; error?: string }> {
    if (!ctx.businessId || !ctx.branchId) {
      return { error: 'Missing businessId or branchId for server sequence allocation.' };
    }
    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { error: 'Server connection required for sequential document numbering.' };
    }

    const year = ctx.fiscalYear ?? new Date().getFullYear();
    try {
      const { data, error } = await (client as any).rpc('allocate_sequence_number', {
        p_business_id: toValidUuid(ctx.businessId),
        p_branch_id: toValidUuid(ctx.branchId),
        p_doc_type: ctx.docType,
        p_fiscal_year: year,
      });

      if (error || !data) {
        return { error: error?.message || 'Sequence allocation RPC failed.' };
      }

      return {
        data: {
          docType: (data.doc_type || ctx.docType) as ServerSequenceDocType,
          fiscalYear: Number(data.fiscal_year ?? year),
          seqNumber: Number(data.seq_number),
          prefix: String(data.prefix || DOC_PREFIX[ctx.docType] || 'DOC'),
          formattedNumber: String(
            data.formatted_number || formatSequenceNumber(ctx.docType, year, Number(data.seq_number))
          ),
        },
      };
    } catch (err: any) {
      return { error: err?.message || 'Sequence allocation failed.' };
    }
  },

  /**
   * Reserves an offline device block strictly for walk-in tickets (`1.1`) or deposit receipts (`3.9`).
   * Fiscal invoices and Z-reports are explicitly rejected.
   */
  async reserveDeviceBlock(ctx: {
    businessId: string;
    branchId: string;
    docType: DeviceBlockDocType;
    blockSize?: number;
    fiscalYear?: number;
    deviceId?: string;
  }): Promise<{ block?: DeviceSequenceBlock; error?: string }> {
    if (!ALLOWED_DEVICE_BLOCK_TYPES.has(ctx.docType as string)) {
      return { error: `DEVICE_BLOCK_UNSUPPORTED_DOC_TYPE: ${ctx.docType}` };
    }
    if (!ctx.businessId || !ctx.branchId) {
      return { error: 'Missing businessId or branchId for device sequence block reservation.' };
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return { error: 'Supabase connection required to reserve a new device sequence block.' };
    }

    const deviceId = ctx.deviceId || getActiveDeviceId();
    const year = ctx.fiscalYear ?? new Date().getFullYear();
    const blockSize = Math.min(500, Math.max(1, Math.floor(ctx.blockSize ?? 50)));

    try {
      const { data, error } = await (client as any).rpc('reserve_sequence_block', {
        p_business_id: toValidUuid(ctx.businessId),
        p_branch_id: toValidUuid(ctx.branchId),
        p_device_id: deviceId,
        p_doc_type: ctx.docType,
        p_block_size: blockSize,
        p_fiscal_year: year,
      });

      if (error || !data) {
        return { error: error?.message || 'reserve_sequence_block RPC failed.' };
      }

      const block: DeviceSequenceBlock = {
        businessId: toValidUuid(ctx.businessId),
        branchId: toValidUuid(ctx.branchId),
        deviceId,
        docType: ctx.docType,
        fiscalYear: Number(data.fiscal_year ?? year),
        rangeStart: Number(data.range_start),
        rangeEnd: Number(data.range_end),
        nextNumber: Number(data.range_start),
        prefix: String(data.prefix || DOC_PREFIX[ctx.docType]),
        allocatedAt: new Date().toISOString(),
      };
      seedLocalDeviceBlock(block);
      return { block };
    } catch (err: any) {
      return { error: err?.message || 'Failed to reserve device sequence block.' };
    }
  },

  /**
   * Consumes the next number from a cached device block (offline-safe) for walk-in tickets
   * or deposit receipts, automatically reserving a fresh block when online and exhausted.
   */
  async allocateFromDeviceBlock(ctx: {
    businessId: string;
    branchId: string;
    docType: DeviceBlockDocType;
    fiscalYear?: number;
    deviceId?: string;
    blockSize?: number;
  }): Promise<{ data?: OfflineBlockAllocationResult; error?: string }> {
    if (!ALLOWED_DEVICE_BLOCK_TYPES.has(ctx.docType as string)) {
      return { error: `DEVICE_BLOCK_UNSUPPORTED_DOC_TYPE: ${ctx.docType}` };
    }
    if (!ctx.businessId || !ctx.branchId) {
      return { error: 'Missing businessId or branchId for document numbering.' };
    }

    const businessUuid = toValidUuid(ctx.businessId);
    const branchUuid = toValidUuid(ctx.branchId);
    const deviceId = ctx.deviceId || getActiveDeviceId();
    const year = ctx.fiscalYear ?? new Date().getFullYear();

    const blocks = getCachedDeviceBlocks();
    const idx = blocks.findIndex(
      (b) =>
        b.businessId === businessUuid &&
        b.branchId === branchUuid &&
        b.deviceId === deviceId &&
        b.docType === ctx.docType &&
        b.fiscalYear === year &&
        b.nextNumber <= b.rangeEnd
    );

    if (idx >= 0) {
      const block = blocks[idx];
      const seqNumber = block.nextNumber;
      blocks[idx] = { ...block, nextNumber: seqNumber + 1 };
      saveCachedDeviceBlocks(blocks);
      return {
        data: {
          seqNumber,
          fiscalYear: year,
          formattedNumber: formatSequenceNumber(ctx.docType, year, seqNumber),
          source: 'device_block',
        },
      };
    }

    // No cached block available: try reserving a fresh block on server if online
    const reserved = await this.reserveDeviceBlock({
      businessId: ctx.businessId,
      branchId: ctx.branchId,
      docType: ctx.docType,
      fiscalYear: year,
      deviceId,
      blockSize: ctx.blockSize,
    });

    if (reserved.block) {
      const updatedBlocks = getCachedDeviceBlocks();
      const newIdx = updatedBlocks.findIndex(
        (b) =>
          b.businessId === reserved.block!.businessId &&
          b.branchId === reserved.block!.branchId &&
          b.deviceId === reserved.block!.deviceId &&
          b.docType === reserved.block!.docType &&
          b.fiscalYear === reserved.block!.fiscalYear &&
          b.rangeStart === reserved.block!.rangeStart
      );
      if (newIdx >= 0) {
        const seqNumber = updatedBlocks[newIdx].nextNumber;
        updatedBlocks[newIdx] = { ...updatedBlocks[newIdx], nextNumber: seqNumber + 1 };
        saveCachedDeviceBlocks(updatedBlocks);
        return {
          data: {
            seqNumber,
            fiscalYear: year,
            formattedNumber: formatSequenceNumber(ctx.docType, year, seqNumber),
            source: 'device_block',
          },
        };
      }
    }

    return {
      error:
        reserved.error ||
        'No offline sequence block is cached on this device. Connect to reserve a sequence block.',
    };
  },
};
