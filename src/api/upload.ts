import type { R2Bucket } from '@cloudflare/workers-types';
import { parseImageDimensions } from '../lib/parseImageDimensions';
import {
  PHOTO_PREFIX,
  buildPhotoKey,
  formatSize,
  getCategoryFromPhotoKey,
  getFilenameFromPhotoKey,
  getPhotoThumbUrl,
  getPhotoUrl,
  getTagsDisplay,
  getUploadedDate,
  normalizeCategory,
  normalizeTags,
  serializeTags,
} from '../lib/photoMetadata';

interface UploadEnv {
  GALARY_BUCKET: R2Bucket;
  CORS_ORIGIN?: string;
}

function getCorsHeaders(env: UploadEnv): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || 'https://shashin.tsukino.dev',
    'Access-Control-Allow-Methods': 'POST, PATCH, DELETE, OPTIONS',
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
    const tagsRaw = (formData.get('tags') as string) || '';

    if (!file) {
      return jsonResponse({ success: false, error: 'No file provided' }, 400, corsHeaders);
    }

    // Parse dimensions server-side from binary header (most reliable)
    // Read first 32KB which contains all image header info
    const headerSlice = file.slice(0, 32768);
    const headerBuffer = await headerSlice.arrayBuffer();
    const parsedDims = parseImageDimensions(new Uint8Array(headerBuffer));
    const widthRaw = parsedDims ? String(parsedDims.width) : ((formData.get('width') as string) || '2000');
    const heightRaw = parsedDims ? String(parsedDims.height) : ((formData.get('height') as string) || '3000');

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

export async function handleUpdate(request: Request, env: UploadEnv): Promise<Response> {
  const corsHeaders = getCorsHeaders(env);
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return jsonResponse({ success: false, error: 'Missing key parameter' }, 400, corsHeaders);
    }
    if (!key.startsWith(PHOTO_PREFIX)) {
      return jsonResponse({ success: false, error: 'Invalid photo key' }, 400, corsHeaders);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return jsonResponse({ success: false, error: 'Expected application/json' }, 400, corsHeaders);
    }

    const payload = await request.json().catch(() => null) as { category?: unknown; tags?: unknown } | null;
    if (!payload || typeof payload !== 'object') {
      return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    const object = await env.GALARY_BUCKET.get(key);
    if (!object) {
      return jsonResponse({ success: false, error: 'Photo not found' }, 404, corsHeaders);
    }

    const filename = getFilenameFromPhotoKey(key);
    if (!filename) {
      return jsonResponse({ success: false, error: 'Invalid photo filename' }, 400, corsHeaders);
    }

    const category = 'category' in payload ? normalizeCategory(payload.category) : getCategoryFromPhotoKey(key);
    const tags = 'tags' in payload ? normalizeTags(payload.tags) : normalizeTags(object.customMetadata?.tags);
    const tagsValue = 'tags' in payload ? serializeTags(payload.tags) : serializeTags(object.customMetadata?.tags);
    const newKey = buildPhotoKey(category, filename);

    if (newKey !== key) {
      const existing = await env.GALARY_BUCKET.head(newKey);
      if (existing) {
        return jsonResponse({ success: false, error: 'Target key already exists' }, 409, corsHeaders);
      }
    }

    const uploaded = getUploadedDate(object.customMetadata, object.uploaded);
    const uploadedIso = uploaded ? uploaded.toISOString() : new Date().toISOString();
    const customMetadata = {
      ...(object.customMetadata || {}),
      uploadedAt: object.customMetadata?.uploadedAt || uploadedIso,
      tags: tagsValue,
    };

    await env.GALARY_BUCKET.put(newKey, object.body, {
      httpMetadata: object.httpMetadata,
      customMetadata,
    });

    let deleteOldFailed = false;
    if (newKey !== key) {
      try {
        await env.GALARY_BUCKET.delete(key);
      } catch (deleteErr: unknown) {
        console.error('Delete old key failed:', deleteErr);
        deleteOldFailed = true;
      }
    }

    const updatedUploaded = getUploadedDate(customMetadata, object.uploaded);
    const date = updatedUploaded ? updatedUploaded.toISOString() : '';
    const responseBody: Record<string, unknown> = {
      success: true,
      oldKey: key,
      key: newKey,
      photo: {
        key: newKey,
        src: getPhotoUrl(newKey),
        thumb: getPhotoThumbUrl(newKey),
        category: getCategoryFromPhotoKey(newKey),
        tags,
        tagsDisplay: getTagsDisplay(tags),
        date,
        dateDisplay: updatedUploaded ? updatedUploaded.toLocaleDateString('zh-CN') : '',
        size: object.size,
        sizeDisplay: formatSize(object.size),
        visibility: 'public',
      },
    };
    if (deleteOldFailed) {
      responseBody.warning = 'Old key cleanup failed; photo was copied to new key successfully';
    }
    return jsonResponse(responseBody, 200, corsHeaders);
  } catch (err: unknown) {
    console.error('Update error:', err);
    const message = err instanceof Error ? err.message : 'Update failed';
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
}

function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
