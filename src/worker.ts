import { handle } from '@astrojs/cloudflare/handler';
import { handleUpload, handleOptions, handleDelete } from './api/upload';
import type { Env } from './types/env';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/upload') {
      if (request.method === 'POST') {
        return handleUpload(request, env);
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
      const imageUrl = `https://cdn.tsukino.dev/${key}`;
      const response = await fetch(imageUrl, {
        cf: { image: { width, quality: 80, fit: 'scale-down' } }
      });
      return response;
    }

    return handle(request, env, ctx);
  }
};
