import type { R2Bucket, R2Object } from '@cloudflare/workers-types';

export interface ListAllOptions {
  prefix?: string;
  include?: ('httpMetadata' | 'customMetadata')[];
  limit?: number;
}

/**
 * Paginate through R2 list() until all objects are collected.
 * Cloudflare R2 listings may be truncated; this helper follows cursors.
 */
export async function listAllObjects(
  bucket: R2Bucket,
  options: ListAllOptions = {}
): Promise<R2Object[]> {
  const results: R2Object[] = [];
  let cursor: string | undefined;

  do {
    const listed = await bucket.list({
      ...options,
      cursor,
    });
    if (listed.objects) {
      results.push(...listed.objects);
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  return results;
}
