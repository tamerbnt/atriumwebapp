export type BatFileFormat = 'pdf' | 'ai' | 'psd' | 'tiff' | 'png' | 'mp4';
export type BatColorSpace = 'CMJN' | 'RVB';
export type BatMetadataStatus = 'verified' | 'manual / unverified';

export interface BatMetadataResult {
  fileFormat: BatFileFormat;
  colorSpace: BatColorSpace | null;
  resolutionDpi: number | null;
  hasBleedIncluded: boolean | null;
  widthPx: number | null;
  heightPx: number | null;
  metadataStatus: BatMetadataStatus;
  unreadableFields: string[];
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

function readUint16(bytes: Uint8Array, offset: number, le: boolean): number {
  return le
    ? bytes[offset] | (bytes[offset + 1] << 8)
    : (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint32(bytes: Uint8Array, offset: number, le: boolean): number {
  if (le) {
    return (
      (bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)) >>>
      0
    );
  }
  return readUint32BE(bytes, offset);
}

function detectFormatFromNameAndBytes(
  fileName: string,
  bytes: Uint8Array
): BatFileFormat {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (bytes.length >= 8 && PNG_SIG.every((b, i) => bytes[i] === b)) return 'png';
  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return 'tiff';
  }
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return ext === 'ai' ? 'ai' : 'pdf';
  }
  if (ext === 'ai' || ext === 'eps') return 'ai';
  if (ext === 'tif' || ext === 'tiff') return 'tiff';
  if (ext === 'png') return 'png';
  if (ext === 'psd') return 'psd';
  return 'pdf';
}

function inspectPng(bytes: Uint8Array): Partial<BatMetadataResult> {
  let widthPx: number | null = null;
  let heightPx: number | null = null;
  let resolutionDpi: number | null = null;
  const colorSpace: BatColorSpace = 'RVB'; // PNG specification only supports RGB/Indexed/Grayscale

  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );
    const dataStart = offset + 8;
    if (dataStart + length > bytes.length) break;

    if (type === 'IHDR' && length >= 13) {
      widthPx = readUint32BE(bytes, dataStart);
      heightPx = readUint32BE(bytes, dataStart + 4);
    } else if (type === 'pHYs' && length >= 9) {
      const ppuX = readUint32BE(bytes, dataStart);
      const unitSpecifier = bytes[dataStart + 8];
      if (unitSpecifier === 1 && ppuX > 0) {
        resolutionDpi = Math.round(ppuX * 0.0254);
      }
    } else if (type === 'IEND') {
      break;
    }

    offset = dataStart + length + 4;
  }

  return { widthPx, heightPx, resolutionDpi, colorSpace, hasBleedIncluded: null };
}

function inspectTiff(bytes: Uint8Array): Partial<BatMetadataResult> {
  if (bytes.length < 8) return {};
  const le = bytes[0] === 0x49 && bytes[1] === 0x49;
  const ifdOffset = readUint32(bytes, 4, le);
  if (ifdOffset + 2 > bytes.length) return {};
  const entryCount = readUint16(bytes, ifdOffset, le);

  let widthPx: number | null = null;
  let heightPx: number | null = null;
  let colorSpace: BatColorSpace | null = null;
  let resolutionDpi: number | null = null;
  let resolutionUnit = 2; // TIFF default is inches (2)

  for (let i = 0; i < entryCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    if (entryOffset + 12 > bytes.length) break;
    const tag = readUint16(bytes, entryOffset, le);
    const type = readUint16(bytes, entryOffset + 2, le);
    const count = readUint32(bytes, entryOffset + 4, le);
    const valueOffset = entryOffset + 8;

    const readScalar = (): number => {
      if (type === 3 && count === 1) return readUint16(bytes, valueOffset, le);
      return readUint32(bytes, valueOffset, le);
    };

    if (tag === 256) widthPx = readScalar();
    else if (tag === 257) heightPx = readScalar();
    else if (tag === 262) {
      const photo = readScalar();
      if (photo === 5) colorSpace = 'CMJN';
      else if (photo === 2 || photo === 3) colorSpace = 'RVB';
    } else if (tag === 296) {
      resolutionUnit = readScalar();
    } else if (tag === 282 && type === 5 && count >= 1) {
      const ratOffset = readUint32(bytes, valueOffset, le);
      if (ratOffset + 8 <= bytes.length) {
        const num = readUint32(bytes, ratOffset, le);
        const den = readUint32(bytes, ratOffset + 4, le);
        if (den > 0) {
          const rawRes = num / den;
          resolutionDpi =
            resolutionUnit === 3 ? Math.round(rawRes * 2.54) : Math.round(rawRes);
        }
      }
    }
  }

  return { widthPx, heightPx, colorSpace, resolutionDpi, hasBleedIncluded: null };
}

function inspectPdfOrAi(bytes: Uint8Array): Partial<BatMetadataResult> {
  const sampleLen = Math.min(bytes.length, 65536);
  let text = '';
  for (let i = 0; i < sampleLen; i++) {
    text += String.fromCharCode(bytes[i]);
  }
  const hasCmyk =
    text.includes('/DeviceCMYK') ||
    text.includes('%%DocumentProcessColors: Cyan Magenta Yellow Black');
  const hasRgb = text.includes('/DeviceRGB');
  const hasBleed =
    text.includes('/BleedBox') || text.includes('%%HiResBoundingBox')
      ? true
      : null;

  return {
    colorSpace: hasCmyk ? 'CMJN' : hasRgb ? 'RVB' : null,
    resolutionDpi: null,
    hasBleedIncluded: hasBleed,
    widthPx: null,
    heightPx: null,
  };
}

/**
 * Extracts verifiable technical metadata from raw BAT file headers.
 * Never invents defaults when a field cannot be read from the file binary:
 * unreadable fields are returned as null and flagged as 'manual / unverified'.
 */
export function inspectBatFileBytes(
  fileName: string,
  bytes: Uint8Array
): BatMetadataResult {
  const fileFormat = detectFormatFromNameAndBytes(fileName, bytes);
  let parsed: Partial<BatMetadataResult> = {};

  if (fileFormat === 'png') {
    parsed = inspectPng(bytes);
  } else if (fileFormat === 'tiff') {
    parsed = inspectTiff(bytes);
  } else if (fileFormat === 'pdf' || fileFormat === 'ai') {
    parsed = inspectPdfOrAi(bytes);
  }

  const colorSpace = parsed.colorSpace ?? null;
  const resolutionDpi = parsed.resolutionDpi ?? null;
  const hasBleedIncluded = parsed.hasBleedIncluded ?? null;

  const unreadableFields: string[] = [];
  if (colorSpace === null) unreadableFields.push('colorSpace');
  if (resolutionDpi === null) unreadableFields.push('resolutionDpi');
  if (hasBleedIncluded === null) unreadableFields.push('bleed');

  return {
    fileFormat,
    colorSpace,
    resolutionDpi,
    hasBleedIncluded,
    widthPx: parsed.widthPx ?? null,
    heightPx: parsed.heightPx ?? null,
    metadataStatus: unreadableFields.length === 0 ? 'verified' : 'manual / unverified',
    unreadableFields,
  };
}

export async function inspectBatFile(file: File): Promise<BatMetadataResult> {
  const slice = file.slice(0, 131072);
  const buffer = await slice.arrayBuffer();
  return inspectBatFileBytes(file.name, new Uint8Array(buffer));
}
