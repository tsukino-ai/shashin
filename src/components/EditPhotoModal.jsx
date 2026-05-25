import { useEffect, useState } from 'react';
import { CATEGORY_OPTIONS } from '../lib/photoMetadata';

export default function EditPhotoModal({ photo, isSaving, error, onClose, onSave }) {
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    setCategory(photo?.category || '');
    setTags(photo?.tagsDisplay || '');
  }, [photo?.key]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave({ category, tags });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-photo-title">
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
            <h3 id="edit-photo-title" className="text-lg font-medium text-white">编辑照片信息</h3>
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
