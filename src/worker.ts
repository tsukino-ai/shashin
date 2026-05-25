import { handle } from '@astrojs/cloudflare/handler';
import { handleUpload, handleOptions, handleDelete } from './api/upload';
import type { Env } from './types/env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/upload') {
      if (request.method === 'POST') {
        const response = await handleUpload(request, env);
        if (response.ok) {
          try {
            const cloned = response.clone();
            const data = await cloned.json();
            if (data.key) {
              const thumbUrl = `https://cdn.tsukino.dev/cdn-cgi/image/w=400,quality=75,fit=scale-down/${data.key}`;
              ctx.waitUntil(
                fetch(thumbUrl, { cf: { cacheEverything: true } }).catch(() => {})
              );
            }
          } catch { /* ignore warmup errors */ }
        }
        return response;
      }
      if (request.method === 'DELETE') {
        return handleDelete(request, env);
      }
      if (request.method === 'OPTIONS') {
        return handleOptions();
      }
    }

    if (url.pathname === '/api/image') {
      const key = url.searchParams.get('key');
      const width = parseInt(url.searchParams.get('width') || '400');
      if (!key) {
        return new Response('Missing key', { status: 400 });
      }

      // Try Cloudflare Image Resizing URL format first
      const resizingUrl = `https://cdn.tsukino.dev/cdn-cgi/image/w=${width},quality=80,fit=scale-down/${key}`;
      const resized = await fetch(resizingUrl, { cf: { cacheEverything: true } });
      if (resized.ok && resized.headers.get('content-type')?.startsWith('image/')) {
        return resized;
      }

      // Fallback: return original image from R2
      const originalUrl = `https://cdn.tsukino.dev/${key}`;
      const original = await fetch(originalUrl);
      return new Response(original.body, {
        status: original.status,
        headers: {
          'Content-Type': original.headers.get('content-type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    return handle(request, env, ctx);
  }
};
