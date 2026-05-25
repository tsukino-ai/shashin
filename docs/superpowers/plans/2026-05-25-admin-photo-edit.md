# Admin Photo Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `/manage` edit one uploaded photo's category and comma-separated tags while keeping upload, admin, and gallery views aligned.

**Architecture:** Keep R2 as the source of truth. Category remains encoded in the R2 key under `photos/`, while tags remain in `customMetadata.tags`; category edits rewrite the object to the new key before deleting the old key. The admin React UI uses a focused edit modal and updates its local photo list after a successful `PATCH /api/upload?key=...`.

**Tech Stack:** Astro 6 SSR on Cloudflare Workers, React 19, Tailwind CSS 4 utilities, TypeScript 6, Cloudflare R2 Workers API.

---

## File Structure

- Create `src/lib/photoMetadata.ts`: shared pure helpers for photo keys, category normalization, tag normalization, CDN URLs, thumbnail URLs, and size formatting.
- Modify `src/api/upload.ts`: add `PATCH` support through `handleUpdate`, reuse shared helpers, preserve metadata, and update CORS methods.
- Modify `src/worker.ts`: route `PATCH /api/upload` to `handleUpdate`.
- Modify `src/pages/manage.astro`: list R2 with metadata included and pass tags/date fields to React.
- Create `src/components/EditPhotoModal.jsx`: single-photo edit form with controlled category and tag inputs.
- Modify `src/components/ManageDashboard.jsx`: own local photo state, open/save the edit modal, replace edited rows, and keep selection keys in sync.
- Modify `src/components/PhotoList.jsx`: display tags and expose an edit action.
- Modify `src/components/PhotoGridManage.jsx`: display tags and expose an edit action.
- Modify `src/components/GalleryPage.astro`: explicitly include R2 custom metadata and prefer `customMetadata.uploadedAt` for display dates.

## Task 1: Shared Photo Metadata Helpers

**Files:**
- Create: `src/lib/photoMetadata.ts`
- Modify: `src/components/UploadManager.jsx`

- [ ] **Step 1: Create `src/lib/photoMetadata.ts` with shared constants and helpers**

```ts
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
```

- [ ] **Step 2: Replace local upload category options with shared options**

In `src/components/UploadManager.jsx`, replace the local `CATEGORY_OPTIONS` constant with:

```jsx
import { CATEGORY_OPTIONS } from '../lib/photoMetadata';
```

Keep the existing `CATEGORY_OPTIONS.slice(1)` usage for batch category selection.

- [ ] **Step 3: Run a build check**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Commit helper extraction**

```bash
git add src/lib/photoMetadata.ts src/components/UploadManager.jsx
git commit -m "refactor: share photo metadata helpers"
```

## Task 2: Backend `PATCH /api/upload` Update API

**Files:**
- Modify: `src/api/upload.ts`
- Modify: `src/worker.ts`

- [ ] **Step 1: Update imports and CORS methods in `src/api/upload.ts`**

Add the shared helper import near the top:

```ts
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
```

Change the CORS methods line in `getCorsHeaders`:

```ts
'Access-Control-Allow-Methods': 'POST, PATCH, DELETE, OPTIONS',
```

- [ ] **Step 2: Add `handleUpdate` below `handleDelete`**

```ts
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

    const category = normalizeCategory(payload.category);
    const tags = normalizeTags(payload.tags);
    const tagsValue = serializeTags(payload.tags);
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

    if (newKey !== key) {
      await env.GALARY_BUCKET.delete(key);
    }

    const updatedUploaded = getUploadedDate(customMetadata, object.uploaded);
    const date = updatedUploaded ? updatedUploaded.toISOString() : '';
    return jsonResponse(
      {
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
      },
      200,
      corsHeaders
    );
  } catch (err: unknown) {
    console.error('Update error:', err);
    const message = err instanceof Error ? err.message : 'Update failed';
    return jsonResponse({ success: false, error: message }, 500, corsHeaders);
  }
}
```

- [ ] **Step 3: Route PATCH in `src/worker.ts`**

Change the import:

```ts
import { handleUpload, handleOptions, handleDelete, handleUpdate } from './api/upload';
```

Add this branch inside `if (url.pathname === '/api/upload')` after the `POST` branch and before `DELETE`:

```ts
if (request.method === 'PATCH') {
  return handleUpdate(request, env);
}
```

- [ ] **Step 4: Run a build check**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 5: Commit backend API**

```bash
git add src/api/upload.ts src/worker.ts
git commit -m "feat: add photo metadata update api"
```

## Task 3: SSR Data Alignment for Admin and Gallery

**Files:**
- Modify: `src/pages/manage.astro`
- Modify: `src/components/GalleryPage.astro`

- [ ] **Step 1: Replace local helpers and metadata extraction in `src/pages/manage.astro`**

Add this import:

```astro
import {
  formatSize,
  getCategoryFromPhotoKey,
  getPhotoThumbUrl,
  getPhotoUrl,
  getTagsDisplay,
  getUploadedDate,
  normalizeTags,
} from '../lib/photoMetadata';
```

Remove the local `formatSize()` function.

Change the R2 listing loop to:

```astro
if (bucket) {
  const prefixes = ['photos/'];
  for (const prefix of prefixes) {
    const listed = await bucket.list({ prefix, include: ['customMetadata', 'httpMetadata'] });
    for (const obj of listed.objects || []) {
      const tags = normalizeTags(obj.customMetadata?.tags || '');
      const uploaded = getUploadedDate(obj.customMetadata, obj.uploaded);
      photos.push({
        key: obj.key,
        src: getPhotoUrl(obj.key),
        thumb: getPhotoThumbUrl(obj.key),
        category: getCategoryFromPhotoKey(obj.key),
        tags,
        tagsDisplay: getTagsDisplay(tags),
        date: uploaded ? uploaded.toISOString() : '',
        dateDisplay: uploaded ? uploaded.toLocaleDateString('zh-CN') : '',
        size: obj.size,
        sizeDisplay: formatSize(obj.size),
        visibility: 'public',
      });
    }
  }
}
```

- [ ] **Step 2: Update `GalleryPage.astro` imports and list calls**

Add these helper imports:

```astro
import { getCategoryFromPhotoKey, getPhotoThumbUrl, getPhotoUrl, getUploadedDate, normalizeTags } from '../lib/photoMetadata';
```

Change both R2 list calls:

```astro
const allListed = await bucket.list({ prefix, include: ['customMetadata'] });
```

```astro
const listed = await bucket.list({ prefix: targetPrefix, include: ['customMetadata', 'httpMetadata'] });
```

In the `photos = ...map` block, replace URL/category/tag/date extraction with:

```astro
const publicUrl = getPhotoUrl(obj.key);
const cat = getCategoryFromPhotoKey(obj.key);
const uploaded = getUploadedDate(obj.customMetadata, obj.uploaded);
const tags = normalizeTags(obj.customMetadata?.tags || '');
return {
  src: publicUrl,
  thumb: getPhotoThumbUrl(obj.key, 400),
  w: parseInt(obj.customMetadata?.width || '2000', 10),
  h: parseInt(obj.customMetadata?.height || '3000', 10),
  key: obj.key,
  category: cat,
  theme: categoryToTheme[cat] || 'lolita',
  tags,
  date: uploaded ? uploaded.toLocaleDateString('zh-CN') : '',
};
```

- [ ] **Step 3: Run a build check**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 4: Commit SSR data alignment**

```bash
git add src/pages/manage.astro src/components/GalleryPage.astro
git commit -m "feat: include photo metadata in admin and gallery"
```

## Task 4: Edit Modal and Dashboard Save Flow

**Files:**
- Create: `src/components/EditPhotoModal.jsx`
- Modify: `src/components/ManageDashboard.jsx`

- [ ] **Step 1: Create `src/components/EditPhotoModal.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { CATEGORY_OPTIONS } from '../lib/photoMetadata';

export default function EditPhotoModal({ photo, isSaving, error, onClose, onSave }) {
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    setCategory(photo?.category || '');
    setTags(photo?.tagsDisplay || '');
  }, [photo]);

  if (!photo) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({ category, tags });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-neutral-800 p-6 shadow-xl">
        <div className="mb-5 flex items-start gap-4">
          <img
            src={photo.thumb}
            alt=""
            className="h-20 w-20 rounded bg-neutral-700 object-cover"
            loading="lazy"
            decoding="async"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-medium text-white">编辑照片信息</h3>
            <p className="mt-1 truncate font-mono text-xs text-neutral-400">{photo.key}</p>
          </div>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-neutral-300">分类</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            disabled={isSaving}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-neutral-300">标签</span>
          <input
            type="text"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="逗号分隔，例如：室内,制服"
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
            disabled={isSaving}
          />
        </label>

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-neutral-700 px-4 py-2 text-sm text-white hover:bg-neutral-600 disabled:opacity-50"
            disabled={isSaving}
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Initialize local photo state and modal state in `ManageDashboard.jsx`**

Update the import:

```jsx
import { useState, useMemo, useCallback } from 'react';
import EditPhotoModal from './EditPhotoModal';
import PhotoList from './PhotoList';
import PhotoGridManage from './PhotoGridManage';
```

At the top of `ManageDashboard`, add local state:

```jsx
const [photoItems, setPhotoItems] = useState(photos);
const [editingPhoto, setEditingPhoto] = useState(null);
const [editError, setEditError] = useState('');
const [isSavingEdit, setIsSavingEdit] = useState(false);
```

Replace all calculations that currently read `photos` with `photoItems`:

```jsx
const categories = useMemo(() => {
  const set = new Set(photoItems.map((p) => p.category).filter(Boolean));
  return Array.from(set).sort();
}, [photoItems]);
```

```jsx
let result = [...photoItems];
```

```jsx
const totalSize = useMemo(() => photoItems.reduce((sum, p) => sum + p.size, 0), [photoItems]);
```

```jsx
return photoItems.filter((p) => p.date && p.date.startsWith(ym)).length;
```

```jsx
<div className="text-2xl font-semibold">{photoItems.length}</div>
```

- [ ] **Step 3: Add edit handlers in `ManageDashboard.jsx`**

Add these callbacks before `handleBatchDelete`:

```jsx
const openEditModal = useCallback((photo) => {
  setEditingPhoto(photo);
  setEditError('');
}, []);

const closeEditModal = useCallback(() => {
  if (isSavingEdit) return;
  setEditingPhoto(null);
  setEditError('');
}, [isSavingEdit]);

const handleSaveEdit = async ({ category, tags }) => {
  if (!editingPhoto || isSavingEdit) return;
  setIsSavingEdit(true);
  setEditError('');
  try {
    const res = await fetch(`/api/upload?key=${encodeURIComponent(editingPhoto.key)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ category, tags }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    const updatedPhoto = data.photo;
    if (!updatedPhoto?.key) {
      throw new Error('服务器返回缺少更新后的照片信息');
    }

    setPhotoItems((prev) => prev.map((photo) => (
      photo.key === editingPhoto.key ? updatedPhoto : photo
    )));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(editingPhoto.key)) {
        next.delete(editingPhoto.key);
        next.add(updatedPhoto.key);
      }
      return next;
    });
    setEditingPhoto(null);
  } catch (err) {
    setEditError(err?.message || '保存失败');
  } finally {
    setIsSavingEdit(false);
  }
};
```

- [ ] **Step 4: Pass edit handlers and render the modal**

Change the content rendering:

```jsx
{viewMode === 'list' ? (
  <PhotoList
    photos={filteredPhotos}
    selectedKeys={selectedKeys}
    onToggleSelect={toggleSelect}
    onSelectKeys={selectKeys}
    onDeselectKeys={deselectKeys}
    onEdit={openEditModal}
  />
) : (
  <PhotoGridManage
    photos={filteredPhotos}
    selectedKeys={selectedKeys}
    onToggleSelect={toggleSelect}
    onEdit={openEditModal}
  />
)}
```

Render this after the delete modal:

```jsx
<EditPhotoModal
  photo={editingPhoto}
  isSaving={isSavingEdit}
  error={editError}
  onClose={closeEditModal}
  onSave={handleSaveEdit}
/>
```

- [ ] **Step 5: Run a build check**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 6: Commit modal and dashboard flow**

```bash
git add src/components/EditPhotoModal.jsx src/components/ManageDashboard.jsx
git commit -m "feat: add admin photo edit modal"
```

## Task 5: List and Grid Edit Actions

**Files:**
- Modify: `src/components/PhotoList.jsx`
- Modify: `src/components/PhotoGridManage.jsx`

- [ ] **Step 1: Update `PhotoList.jsx` props and table header**

Change the function signature:

```jsx
export default function PhotoList({ photos, selectedKeys, onToggleSelect, onSelectKeys, onDeselectKeys, onEdit }) {
```

Add a tags header after the category header:

```jsx
<th className="px-4 py-3 text-left">标签</th>
```

- [ ] **Step 2: Render tags and edit action in each table row**

Add this cell after the category cell:

```jsx
<td className="px-4 py-3">
  {photo.tags?.length > 0 ? (
    <div className="flex max-w-[180px] flex-wrap gap-1">
      {photo.tags.map((tag) => (
        <span key={tag} className="rounded-full bg-neutral-700 px-2 py-0.5 text-xs text-neutral-200">
          {tag}
        </span>
      ))}
    </div>
  ) : (
    <span className="text-xs text-neutral-600">-</span>
  )}
</td>
```

Add the edit button before copy/delete:

```jsx
<button
  onClick={() => onEdit(photo)}
  className="text-xs text-emerald-400 hover:text-emerald-300"
  title="编辑分类和标签"
>
  编辑
</button>
```

- [ ] **Step 3: Update `PhotoGridManage.jsx` props**

Change the function signature:

```jsx
export default function PhotoGridManage({ photos, selectedKeys, onToggleSelect, onEdit }) {
```

- [ ] **Step 4: Render tags and edit action in grid cards**

Inside the hover overlay, replace the existing metadata block with:

```jsx
<div className="min-w-0 flex-1 text-xs text-white/80">
  <div className="truncate">
    {photo.category && <span className="mr-2">{photo.category}</span>}
    <span className="text-white/50">{photo.sizeDisplay}</span>
  </div>
  {photo.tags?.length > 0 && (
    <div className="mt-1 flex flex-wrap gap-1">
      {photo.tags.slice(0, 3).map((tag) => (
        <span key={tag} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white">
          {tag}
        </span>
      ))}
    </div>
  )}
</div>
```

Add this edit button before the copy button:

```jsx
<button
  onClick={() => onEdit(photo)}
  className="h-8 rounded-full bg-emerald-500/70 px-3 text-xs text-white backdrop-blur hover:bg-emerald-500"
  title="编辑分类和标签"
>
  编辑
</button>
```

- [ ] **Step 5: Run a build check**

Run: `npm run build`

Expected: build succeeds.

- [ ] **Step 6: Commit list and grid actions**

```bash
git add src/components/PhotoList.jsx src/components/PhotoGridManage.jsx
git commit -m "feat: expose photo edit actions in manage views"
```

## Task 6: Full Verification

**Files:**
- No source files created in this task.

- [ ] **Step 1: Run production build**

Run: `npm run build`

Expected: command exits with code 0.

- [ ] **Step 2: Start local dev server for manual checks**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Astro prints a local URL, usually `http://127.0.0.1:4321/`.

- [ ] **Step 3: Manual admin checks**

Open `/manage` in the browser and verify:

- Existing photos display category and tags.
- Clicking `编辑` opens a modal with the current category and tags.
- Editing only tags saves successfully and updates the row/card without a full page reload.
- Editing category saves successfully and updates the row/card key, URL, category, and selection state.
- Copy link after a category edit uses the new URL.
- Delete after a category edit uses the new key.

- [ ] **Step 4: Manual gallery checks**

Open `/` and verify:

- The edited photo appears under the edited category.
- The new tag appears in the tag filter.
- Clicking the new tag filters to photos containing that tag.
- The displayed date remains the original upload date, not the edit time.

- [ ] **Step 5: Confirm the working tree**

Run: `git status --short`

Expected: no output. If there is output, inspect it before finishing because verification changed source files.

## Plan Self-Review

- Spec coverage: backend `PATCH`, key rewriting, metadata preservation, admin modal, list/grid edit actions, gallery metadata include, error handling, and manual verification are all mapped to tasks.
- Red-flag scan: no unresolved markers or vague implementation steps remain.
- Type consistency: helpers return `string[]` tags; admin photo objects use `tags`, `tagsDisplay`, `category`, `date`, `dateDisplay`, `src`, and `thumb` consistently across Astro and React files.
