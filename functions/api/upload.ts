import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  GALARY_BUCKET: R2Bucket;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://galary.tsukino.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Upload-Metadata',
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ success: false, error: 'Expected multipart/form-data' }, 415);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const visibilityRaw = (formData.get('visibility') as string) || 'public';
    const visibility = ['public', 'private'].includes(visibilityRaw) ? visibilityRaw : 'public';

    if (!file) {
      return jsonResponse({ success: false, error: 'No file provided' }, 400);
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse(
        { success: false, error: `Invalid type: ${file.type}. Allowed: jpeg, png, webp` },
        415
      );
    }

    // Validate size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse({ success: false, error: 'File too large (max 25MB)' }, 413);
    }

    // Validate visibility prefix
    const prefix = visibility === 'private' ? 'private/' : 'public/';

    // Generate filename: prefix/timestamp-uuid.jpg
    const timestamp = Date.now();
    const uuid = crypto.randomUUID().split('-')[0];
    const key = `${prefix}${timestamp}-${uuid}.jpg`;

    // Stream directly to R2 (no memory buffering)
    await env.GALARY_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: 'image/jpeg',
        contentDisposition: `inline; filename="${timestamp}.jpg"`,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        visibility: visibility,
      },
    });

    // Construct public URL (R2 public bucket)
    const publicUrl = `https://cdn.tsukino.dev/${key}`;

    return jsonResponse({ success: true, url: publicUrl, key, size: file.size }, 200);
  } catch (err: unknown) {
    console.error('Upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return jsonResponse({ success: false, error: message }, 500);
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
