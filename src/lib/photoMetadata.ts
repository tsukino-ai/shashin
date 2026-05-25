export const PHOTO_PREFIX = 'photos/';
export const CDN_BASE_URL = 'https://cdn.tsukino.dev';

export const CATEGORY_OPTIONS = [
  { value: '', label: '- 无分类 -' },
  { value: 'lolita', label: 'Lolita' },
  { value: 'jk', label: 'JK' },
  { value: 'jirai', label: '地雷系' },
  { value: 'seiso', label: '清楚系' },
];

export interface ManagedPhoto {
  key: string;
  src: string;
  thumb: string;
  category: string;
  tags: string[];
  tagsDisplay: string;
  date: string;
  dateDisplay: string;
  size: number;
  sizeDisplay: string;
  visibility: string;
}

export function normalizeCategory(value: unknown): string {
  return String(value || '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '');
}

export function normalizeTags(value: unknown): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  String(value || '')
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      if (!seen.has(tag)) {
        seen.add(tag);
        result.push(tag);
      }
    });
  return result;
}

export function serializeTags(value: unknown): string {
  return normalizeTags(value).join(',');
}

export function getTagsDisplay(tags: string[]): string {
  return tags.length > 0 ? tags.join(', ') : '';
}

export function getCategoryFromPhotoKey(key: string): string {
  if (!key.startsWith(PHOTO_PREFIX)) return '';
  const relativeKey = key.slice(PHOTO_PREFIX.length);
  const parts = relativeKey.split('/');
  return parts.length > 1 ? parts[0] : '';
}

export function getFilenameFromPhotoKey(key: string): string | null {
  if (!key.startsWith(PHOTO_PREFIX)) return null;
  const filename = key.slice(PHOTO_PREFIX.length).split('/').pop();
  return filename || null;
}

export function buildPhotoKey(category: unknown, filename: string): string {
  const normalizedCategory = normalizeCategory(category);
  return normalizedCategory
    ? `${PHOTO_PREFIX}${normalizedCategory}/${filename}`
    : `${PHOTO_PREFIX}${filename}`;
}

export function getPhotoUrl(key: string): string {
  return `${CDN_BASE_URL}/${key}`;
}

export function getPhotoThumbUrl(key: string, width = 200): string {
  return `${CDN_BASE_URL}/cdn-cgi/image/w=${width},quality=75,fit=scale-down/${key}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getUploadedDate(customMetadata?: Record<string, string>, uploaded?: Date): Date | null {
  const uploadedAt = customMetadata?.uploadedAt;
  if (uploadedAt) {
    const parsed = new Date(uploadedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return uploaded || null;
}
