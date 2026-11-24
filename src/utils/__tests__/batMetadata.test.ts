import { describe, it, expect } from 'vitest';
import { inspectBatFileBytes } from '../batMetadata';

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + 4);
  const len = data.length >>> 0;
  out[0] = (len >>> 24) & 0xff;
  out[1] = (len >>> 16) & 0xff;
  out[2] = (len >>> 8) & 0xff;
  out[3] = len & 0xff;
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  return out;
}

function makePngBytes(width: number, height: number, dpi?: number): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = new Uint8Array(13);
  ihdr[0] = (width >>> 24) & 0xff;
  ihdr[1] = (width >>> 16) & 0xff;
  ihdr[2] = (width >>> 8) & 0xff;
  ihdr[3] = width & 0xff;
  ihdr[4] = (height >>> 24) & 0xff;
  ihdr[5] = (height >>> 16) & 0xff;
  ihdr[6] = (height >>> 8) & 0xff;
  ihdr[7] = height & 0xff;
  ihdr[8] = 8;
  ihdr[9] = 2;
  const chunks: Uint8Array[] = [sig, makeChunk('IHDR', ihdr)];

  if (dpi && dpi > 0) {
    const ppu = Math.round(dpi / 0.0254);
    const phys = new Uint8Array(9);
    phys[0] = (ppu >>> 24) & 0xff;
    phys[1] = (ppu >>> 16) & 0xff;
    phys[2] = (ppu >>> 8) & 0xff;
    phys[3] = ppu & 0xff;
    phys[4] = phys[0];
    phys[5] = phys[1];
    phys[6] = phys[2];
    phys[7] = phys[3];
    phys[8] = 1; // meters
    chunks.push(makeChunk('pHYs', phys));
  }

  chunks.push(makeChunk('IEND', new Uint8Array(0)));
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function makeTiffLeCmykBytes(width: number, height: number, dpi: number): Uint8Array {
  // Header (8 bytes) + IFD count (2) + 5 entries (60) + rational (8) = 78 bytes
  const buf = new Uint8Array(96);
  // Little-endian TIFF magic: II 42 0
  buf[0] = 0x49;
  buf[1] = 0x49;
  buf[2] = 0x2a;
  buf[3] = 0x00;
  buf[4] = 8; // IFD offset = 8

  // 5 IFD entries
  buf[8] = 5;
  const writeEntry = (idx: number, tag: number, type: number, count: number, value: number) => {
    const o = 10 + idx * 12;
    buf[o] = tag & 0xff;
    buf[o + 1] = (tag >>> 8) & 0xff;
    buf[o + 2] = type & 0xff;
    buf[o + 3] = (type >>> 8) & 0xff;
    buf[o + 4] = count & 0xff;
    buf[o + 5] = (count >>> 8) & 0xff;
    buf[o + 6] = (count >>> 16) & 0xff;
    buf[o + 7] = (count >>> 24) & 0xff;
    buf[o + 8] = value & 0xff;
    buf[o + 9] = (value >>> 8) & 0xff;
    buf[o + 10] = (value >>> 16) & 0xff;
    buf[o + 11] = (value >>> 24) & 0xff;
  };

  const ratOffset = 72;
  writeEntry(0, 256, 4, 1, width); // ImageWidth
  writeEntry(1, 257, 4, 1, height); // ImageLength
  writeEntry(2, 262, 3, 1, 5); // PhotometricInterpretation = 5 (CMYK)
  writeEntry(3, 296, 3, 1, 2); // ResolutionUnit = 2 (inches)
  writeEntry(4, 282, 5, 1, ratOffset); // XResolution RATIONAL

  // Rational: dpi / 1
  buf[ratOffset] = dpi & 0xff;
  buf[ratOffset + 1] = (dpi >>> 8) & 0xff;
  buf[ratOffset + 4] = 1;
  return buf;
}

describe('batMetadata.ts — binary BAT header inspection without fabricated defaults', () => {
  it('reads PNG dimensions and DPI from IHDR/pHYs and marks bleed unreadable', () => {
    const png = makePngBytes(1920, 1080, 300);
    const meta = inspectBatFileBytes('flyer.png', png);
    expect(meta.fileFormat).toBe('png');
    expect(meta.widthPx).toBe(1920);
    expect(meta.heightPx).toBe(1080);
    expect(meta.colorSpace).toBe('RVB');
    expect(meta.resolutionDpi).toBe(300);
    expect(meta.hasBleedIncluded).toBeNull();
    expect(meta.metadataStatus).toBe('manual / unverified');
    expect(meta.unreadableFields).toEqual(['bleed']);
  });

  it('never fabricates DPI on PNG missing pHYs chunk', () => {
    const png = makePngBytes(800, 600);
    const meta = inspectBatFileBytes('web-banner.png', png);
    expect(meta.widthPx).toBe(800);
    expect(meta.heightPx).toBe(600);
    expect(meta.resolutionDpi).toBeNull();
    expect(meta.metadataStatus).toBe('manual / unverified');
    expect(meta.unreadableFields).toContain('resolutionDpi');
  });

  it('reads TIFF CMYK colorspace and resolution without inventing bleed', () => {
    const tiff = makeTiffLeCmykBytes(2480, 3508, 300);
    const meta = inspectBatFileBytes('packaging.tif', tiff);
    expect(meta.fileFormat).toBe('tiff');
    expect(meta.widthPx).toBe(2480);
    expect(meta.heightPx).toBe(3508);
    expect(meta.colorSpace).toBe('CMJN');
    expect(meta.resolutionDpi).toBe(300);
    expect(meta.hasBleedIncluded).toBeNull();
    expect(meta.metadataStatus).toBe('manual / unverified');
  });

  it('detects DeviceCMYK and BleedBox in PDF bytes and keeps DPI null', () => {
    const pdfText = '%PDF-1.7\n1 0 obj << /ColorSpace /DeviceCMYK /BleedBox [0 0 600 850] >> endobj';
    const bytes = new TextEncoder().encode(pdfText);
    const meta = inspectBatFileBytes('catalogue.pdf', bytes);
    expect(meta.fileFormat).toBe('pdf');
    expect(meta.colorSpace).toBe('CMJN');
    expect(meta.hasBleedIncluded).toBe(true);
    expect(meta.resolutionDpi).toBeNull();
    expect(meta.metadataStatus).toBe('manual / unverified');
    expect(meta.unreadableFields).toEqual(['resolutionDpi']);
  });

  it('falls back safely to manual / unverified with null fields on corrupt or empty binary', () => {
    const meta = inspectBatFileBytes('corrupt.psd', new Uint8Array([0x00, 0xff, 0x12]));
    expect(meta.fileFormat).toBe('psd');
    expect(meta.colorSpace).toBeNull();
    expect(meta.resolutionDpi).toBeNull();
    expect(meta.hasBleedIncluded).toBeNull();
    expect(meta.widthPx).toBeNull();
    expect(meta.heightPx).toBeNull();
    expect(meta.metadataStatus).toBe('manual / unverified');
    expect(meta.unreadableFields).toEqual(['colorSpace', 'resolutionDpi', 'bleed']);
  });
});
