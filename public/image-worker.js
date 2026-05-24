/**
 * Browser Web Worker: image decode → watermark → JPEG export
 * Receives: { file: File, config: WatermarkConfig }
 * Returns: { blob: Blob, width: number, height: number }
 */
self.onmessage = async (e) => {
  let bitmap = null;
  try {
    const { file, config } = e.data;
    if (!file || !config) {
      throw new Error('Missing file or config');
    }

    // 1. Decode image efficiently (no DOM needed)
    bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;

    const MAX_DIMENSION = 10000;
    const MAX_PIXELS = 100_000_000;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
      throw new Error(`Image too large: ${width}x${height}`);
    }

    // 2. Create OffscreenCanvas matching image dimensions
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 3. Draw original image
    ctx.drawImage(bitmap, 0, 0);

    // 4. Draw watermark based on config
    ctx.save();
    ctx.globalAlpha = config.opacity ?? 0.4;
    ctx.font = `${config.fontSize ?? 24}px ${config.fontFamily ?? 'Arial'}`;
    ctx.fillStyle = config.fontColor ?? 'rgba(255,255,255,0.6)';
    const rotateRad = ((config.rotate ?? 45) * Math.PI) / 180;

    const gapX = config.gapX ?? 200;
    const gapY = config.gapY ?? 150;
    if (gapX <= 0 || gapY <= 0) {
      throw new Error('gapX and gapY must be positive');
    }

    const text = config.content ?? '©';
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = config.fontSize ?? 24;

    // Calculate bounding box after rotation to cover entire image
    const diag = Math.sqrt(width * width + height * height);
    const cols = Math.ceil(diag / gapX) + 2;
    const rows = Math.ceil(diag / gapY) + 2;
    const startX = -diag / 2;
    const startY = -diag / 2;

    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotateRad);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * gapX;
        const y = startY + r * gapY;
        ctx.fillText(text, x - textWidth / 2, y + textHeight / 2);
      }
    }

    ctx.restore();

    // 5. Export as JPEG blob (quality 0.95 to preserve detail)
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.95,
    });

    // 6. Transfer ArrayBuffer back to main thread (zero-copy)
    const arrayBuffer = await blob.arrayBuffer();
    self.postMessage({ success: true, arrayBuffer, width, height }, [arrayBuffer]);
  } catch (err) {
    self.postMessage({ success: false, error: err?.message || String(err) });
  } finally {
    if (bitmap) {
      bitmap.close();
    }
  }
};
