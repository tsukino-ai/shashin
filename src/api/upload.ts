import type { R2Bucket } from '@cloudflare/workers-types';

interface UploadEnv {
  GALARY_BUCKET: R2Bucket;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://shashin.tsukino.dev',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Upload-Metadata',
};

export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function handleUpload(request: Request, env: UploadEnv): Promise<Response> {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ success: false, error: 'Expected multipart/form-data' }, 415);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const visibilityRaw = (formData.get('visibility') as string) || 'public';
    const visibility = ['public', 'private'].includes(visibilityRaw) ? visibilityRaw : 'public';
    const categoryRaw = (formData.get('category') as string) || 'default';
    const category = categoryRaw.replace(/[^a-zA-Z0-9_-]/g, '') || 'default';

    if (!file) {
      return jsonResponse({ success: false, error: 'No file provided' }, 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse(
        { success: false, error: `Invalid type: ${file.type}. Allowed: jpeg, png, webp` },
        415
      );
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse({ success: false, error: 'File too large (max 25MB)' }, 413);
    }

    const prefix = visibility === 'private' ? 'private/' : 'public/';
    const timestamp = Date.now();
    const uuid = crypto.randomUUID().split('-')[0];
    const key = `${prefix}${category}/${timestamp}-${uuid}.jpg`;

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

    const publicUrl = `https://cdn.tsukino.dev/${key}`;

    return jsonResponse({ success: true, url: publicUrl, key, size: file.size }, 200);
  } catch (err: unknown) {
    console.error('Upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return jsonResponse({ success: false, error: message }, 500);
  }
}

export async function handleDelete(request: Request, env: UploadEnv): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return jsonResponse({ success: false, error: 'Missing key parameter' }, 400);
    }

    await env.GALARY_BUCKET.delete(key);
    return jsonResponse({ success: true }, 200);
  } catch (err: unknown) {
    console.error('Delete error:', err);
    const message = err instanceof Error ? err.message : 'Delete failed';
    return jsonResponse({ success: false, error: message }, 500);
  }
}

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
