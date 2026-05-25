# 后台单张照片编辑分类和标签设计

## Goal

补齐 `/manage` 后台管理能力，让已经上传到 R2 的单张照片可以编辑分类和标签，并与现有上传页、展示页的数据模型保持一致。

当前上传链路已经将分类写入 R2 key，将标签写入 R2 `customMetadata.tags`。展示页也从这两个位置读取数据。后台管理页目前只支持查看、筛选、复制链接和删除，因此需要新增单张编辑闭环。

## Existing Data Model

- 照片对象存储在 `photos/` 前缀下。
- 有分类照片的 key 形如 `photos/{category}/{timestamp}-{uuid}.{ext}`。
- 无分类照片的 key 形如 `photos/{timestamp}-{uuid}.{ext}`。
- 标签存储在 R2 object `customMetadata.tags` 中，格式为逗号分隔字符串。
- 宽高、原始文件名、上传时间等元数据存储在 `customMetadata`。

## Docs Consulted

- Astro endpoint docs: SSR endpoints can handle request methods and read `request.json()`.
- Cloudflare R2 Workers API docs: `get()`, `put()`, `delete()`, and `list({ include })` are available; R2 writes, deletes, metadata updates, and listing are strongly consistent.
- React docs: controlled inputs need `value` plus `onChange`; object and array state should be replaced rather than mutated.
- Tailwind docs: existing utility patterns for flex, grid, spacing, overflow, and rounded controls remain suitable for the management UI.

## Recommended Approach

Use R2 as the single source of truth and update one photo through a new `PATCH /api/upload?key=...` endpoint.

The backend will read the old object, sanitize the submitted category and tags, write the photo body and preserved metadata to the target key, then delete the old key if the category changed. This follows the current storage model and keeps the public gallery and admin page aligned.

### Alternatives Considered

1. Store category and tags in a sidecar JSON or KV index.
   - Pros: avoids moving R2 objects when category changes.
   - Cons: introduces a second source of truth and requires rewriting gallery filtering around the index.

2. Re-upload from the browser.
   - Pros: simple conceptually.
   - Cons: slow, wasteful, easy to lose metadata, and weaker than editing the existing R2 object server-side.

3. Recommended: R2 read-write-delete update.
   - Pros: preserves the current model, works with existing gallery URLs, and keeps implementation scoped.
   - Cons: changing category changes the object URL because the key path changes.

## Backend Design

Add `handleUpdate(request, env)` to `src/api/upload.ts` and route `PATCH /api/upload` to it in `src/worker.ts`.

Request:

```json
{
  "category": "jk",
  "tags": "室内,制服,蓝白"
}
```

Validation:

- `key` query parameter is required.
- `key` must start with `photos/`.
- The object must exist; otherwise return 404.
- Category is sanitized with the same character rules as upload: English letters, numbers, Chinese characters, underscore, and hyphen.
- Tags are split by comma, trimmed, empty values removed, deduplicated, and joined back with commas.
- New key collisions return 409 instead of overwriting another object.

Update flow:

1. Read the old object with `bucket.get(key)`.
2. Extract the filename from the old key.
3. Compute the new key:
   - Empty category: `photos/{filename}`
   - Category present: `photos/{category}/{filename}`
4. Merge metadata:
   - Preserve existing `customMetadata`.
   - Replace `tags` with normalized submitted tags.
   - Preserve `originalName`, `width`, `height`, and `uploadedAt` when present.
   - If `uploadedAt` is missing, use the old object's `uploaded` timestamp.
5. Write the object body to the new key with preserved `httpMetadata` and merged `customMetadata`.
6. If the key changed, delete the old key after `put()` succeeds.
7. Return the updated photo key, URL, category, tags, and metadata fields needed by the UI.

The update is not fully transactional, but the write-before-delete order prevents data loss in the normal failure modes. If delete fails after a successful write, the API should report the failure so the admin can retry or clean up.

## Admin UI Design

`/manage` remains the entry point. The first implementation only supports editing one photo at a time.

Changes:

- The management page lists R2 objects with `include: ['customMetadata', 'httpMetadata']`.
- Each photo prop includes `tags`, `tagsDisplay`, `category`, `date`, `dateDisplay`, and existing size/link fields.
- `ManageDashboard` owns a local `photoItems` state initialized from `photos`, so a successful edit can update the UI without a full page reload.
- `PhotoList` and `PhotoGridManage` receive an `onEdit(photo)` callback.
- List view adds a `标签` column and an `编辑` action.
- Grid view shows tags in the hover overlay and adds an edit action next to copy/delete.
- Editing opens a modal with:
  - Thumbnail preview
  - Read-only current key
  - Category select using the same canonical options as upload
  - Tags text input using comma-separated tags
  - Save and cancel buttons

Save behavior:

1. Disable modal actions while saving.
2. Call `PATCH /api/upload?key={photo.key}` with JSON body.
3. On success, replace the photo object in local state.
4. If the key changed, update `selectedKeys` by removing the old key and adding the new one when the old key was selected.
5. Recompute filters and sort from local state.
6. Show an inline error if the API fails.

## Gallery Alignment

`GalleryPage.astro` should also list with `include: ['customMetadata', 'httpMetadata']` so tags and dimensions are consistently available after edits.

Display ordering and dates should prefer `customMetadata.uploadedAt` over the R2 object's latest `uploaded` timestamp. This keeps a category edit from making an old photo appear as newly uploaded.

## Error Handling

- Missing key: 400 JSON error.
- Key outside `photos/`: 400 JSON error.
- Missing object: 404 JSON error.
- New key collision: 409 JSON error.
- Unsupported request body: 400 JSON error.
- R2 failures: 500 JSON error with a concise message.
- Frontend shows the error in the edit modal and keeps the modal open.
- After a category change, the old R2 key is deleted. Existing CDN edge cache for the old URL may live until normal cache expiry, so the UI should treat the returned new key and URL as canonical.

## Security

This feature relies on the same Cloudflare Access protection already intended for `/manage` and `/upload`. The API still validates the key prefix server-side so a malformed admin request cannot edit objects outside the photo namespace.

## Testing

Run `npm run build` before claiming completion.

Manual verification:

1. Open `/manage` and confirm existing photos show category and tags.
2. Edit only tags for one photo; confirm the admin UI updates and gallery tag filtering sees the new tag.
3. Edit category for one photo; confirm the key and CDN URL update, the old key no longer appears in R2 listing, and the photo appears under the new category.
4. Edit category back to empty; confirm the key becomes `photos/{filename}`.
5. Try saving a colliding category/key if possible; confirm a 409 error is shown.
6. Confirm copy link and delete still operate on the updated key.

## Out Of Scope

- Batch editing selected photos.
- Creating or managing category definitions beyond the existing upload options.
- Moving files outside the `photos/` namespace.
- Changing image binary data, watermark settings, dimensions, or original filename.
- Reworking TUS upload behavior.
