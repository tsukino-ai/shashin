/**
 * Parse image dimensions from binary headers without external libraries.
 * Supports JPEG, PNG, WebP.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

function parseJpeg(data: Uint8Array): ImageDimensions | null {
  let i = 2; // Skip SOI marker (FFD8)
  while (i < data.length - 9) {
    // Find next marker
    if (data[i] !== 0xFF) {
      i++;
      continue;
    }
    const marker = data[i + 1];
    // Skip padding and standalone markers
    if (marker === 0x00 || (marker >= 0xD0 && marker <= 0xD9) || marker === 0x01) {
      i += 2;
      continue;
    }
    // SOF markers: C0-CF except C4,C8,CC
    if ((marker >= 0xC0 && marker <= 0xCF) && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      // Structure: FF Cx LL PP HH HH WW WW
      // LL = length (2 bytes), PP = precision (1 byte)
      // HH HH = height (2 bytes big-endian), WW WW = width (2 bytes big-endian)
      const height = (data[i + 5] << 8) | data[i + 6];
      const width = (data[i + 7] << 8) | data[i + 8];
      if (width > 0 && height > 0) {
        return { width, height };
      }
    }
    // Read segment length to skip
    const segmentLength = (data[i + 2] << 8) | data[i + 3];
    if (segmentLength < 2) break;
    i += 2 + segmentLength;
  }
  return null;
}

function parsePng(data: Uint8Array): ImageDimensions | null {
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (data.length < 24) return null;
  // IHDR chunk starts at offset 8 (after signature) + 4 (length) + 4 ("IHDR")
  // Width: offset 16-19, Height: offset 20-23 (big-endian)
  const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
  const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
  if (width > 0 && height > 0) {
    return { width, height };
  }
  return null;
}

function parseWebp(data: Uint8Array): ImageDimensions | null {
  // RIFF header + WEBP at offset 8
  if (data.length < 30) return null;
  const chunkType = String.fromCharCode(data[12], data[13], data[14], data[15]);

  if (chunkType === 'VP8 ') {
    // VP8 (lossy): offset 26-27 = width (14 bits), 28-29 = height (14 bits), little-endian
    const widthBytes = (data[26] | (data[27] << 8)) & 0x3FFF;
    const heightBytes = (data[28] | (data[29] << 8)) & 0x3FFF;
    if (widthBytes > 0 && heightBytes > 0) {
      return { width: widthBytes, height: heightBytes };
    }
  } else if (chunkType === 'VP8L') {
    // VP8L (lossless): offset 21-24 contains dimensions
    // Format: b[21..24] little-endian
    // bits 0-13 = width-1, bits 14-27 = height-1
    const b0 = data[21];
    const b1 = data[22];
    const b2 = data[23];
    const b3 = data[24];
    const bits = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
    const width = (bits & 0x3FFF) + 1;
    const height = ((bits >> 14) & 0x3FFF) + 1;
    if (width > 0 && height > 0) {
      return { width, height };
    }
  } else if (chunkType === 'VP8X') {
    // VP8X (extended): width and height at offset 24-29, 24-bit little-endian + 1
    const width = ((data[24] | (data[25] << 8) | (data[26] << 16)) & 0xFFFFFF) + 1;
    const height = ((data[27] | (data[28] << 8) | (data[29] << 16)) & 0xFFFFFF) + 1;
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }
  return null;
}

export function parseImageDimensions(data: Uint8Array): ImageDimensions | null {
  if (data.length < 8) return null;
  const isJpeg = data[0] === 0xFF && data[1] === 0xD8;
  const isPng = data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47;
  const isWebp = data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46
    && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50;

  if (isJpeg) return parseJpeg(data);
  if (isPng) return parsePng(data);
  if (isWebp) return parseWebp(data);
  return null;
}
