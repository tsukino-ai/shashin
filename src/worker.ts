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

    return handle(request, env, ctx);
  }
};
