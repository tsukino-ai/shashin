import type { R2Bucket } from '@cloudflare/workers-types';

interface UploadEnv {
  GALARY_BUCKET: R2Bucket;
  CORS_ORIGIN?: string;
}

function getCorsHeaders(env: UploadEnv): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://shashin.tsukino.dev',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Upload-Metadata',
  };
}

export function handleOptions(env: UploadEnv): Response {
  return new Response(null, { status: 204, headers: getCorsHeaders(env) });
}

export async function handleUpload(request: Request, env: UploadEnv): Promise<Response> {
  const corsHeaders = getCorsHeaders(env);
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ success: false, error: 'Expected multipart/form-data' }, 415, corsHeaders);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const categoryRaw = (formData.get('category') as string) || '';
    const category = categoryRaw.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '');
    const widthRaw = (formData.get('width') as string) || '2000';
    const heightRaw = (formData.get('height') as string) || '3000';
    const tagsRaw = (formData.get('tags') as string) || '';

    if (!file) {
      return jsonResponse({ success: false, error: 'No file provided' }, 400, corsHeaders);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse(
        { success: false, error: `Invalid type: ${file.type}. Allowed: jpeg, png, webp` },
        415,
        corsHeaders
      );
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse({ success: false, error: 'File too large (max 100MB)' }, 413, corsHeaders);
    }

    const timestamp = Date.now();
    const uuid = crypto.randomUUID().split('-')[0];
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const ext = extMap[file.type] || 'jpg';
    const key = category ? `photos/${category}/${timestamp}-${uuid}.${ext}` : `photos/${timestamp}-${uuid}.${ext}`;

    await env.GALARY_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `inline; filename="${timestamp}.${ext}"`,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        width: widthRaw,
        height: heightRaw,
        tags: tagsRaw,
      },
    });

    const publicUrl = `https://cdn.tsukino.dev/${key}`;

    return jsonResponse({ success: true, url: publicUrl, key, size: file.size }, 200, corsHeaders);
  } catch (err: unknown) {
    console.error('Upload error:', err);
    const message = err instanceof Error ? err.message : 'Upload failed';
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
}

export async function handleDelete(request: Request, env: UploadEnv): Promise<Response> {
  const corsHeaders = getCorsHeaders(env);
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return jsonResponse({ success: false, error: 'Missing key parameter' }, 400, corsHeaders);
    }

    await env.GALARY_BUCKET.delete(key);
    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (err: unknown) {
    console.error('Delete error:', err);
    const message = err instanceof Error ? err.message : 'Delete failed';
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
}

function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
