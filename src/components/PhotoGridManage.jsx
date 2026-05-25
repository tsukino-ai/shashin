export default function PhotoGridManage({ photos, selectedKeys, onToggleSelect, onEdit }) {
  const handleCopy = (src) => {
    navigator.clipboard.writeText(src);
  };

  const handleDelete = async (key) => {
    if (!confirm('确定删除这张图片？')) return;
    try {
      const res = await fetch(`/api/upload?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      window.location.reload();
    } catch (err) {
      alert('删除失败: ' + (err?.message || String(err)));
    }
  };

  return (
    <div className="masonry">
      {photos.map((photo) => (
        <div key={photo.key} className="masonry-item relative mb-4 group">
          <div className="relative overflow-hidden rounded-lg bg-neutral-800">
            <a href={photo.src} target="_blank" rel="noopener noreferrer">
              <img
                src={photo.thumb}
                alt=""
                className="w-full h-auto object-cover opacity-0 transition-opacity duration-300"
                loading="lazy"
                decoding="async"
                onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
              />
            </a>

            {/* Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={selectedKeys.has(photo.key)}
                onChange={() => onToggleSelect(photo.key)}
                className="w-5 h-5 rounded border-2 border-white/50 bg-black/30 checked:bg-blue-600"
              />
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
              <div className="flex items-center justify-between">
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
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(photo)}
                    className="h-8 rounded-full bg-emerald-500/70 px-3 text-xs text-white backdrop-blur hover:bg-emerald-500"
                    title="编辑分类和标签"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleCopy(photo.src)}
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-xs backdrop-blur"
                    title="复制链接"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => handleDelete(photo.key)}
                    className="w-8 h-8 rounded-full bg-red-500/70 hover:bg-red-500 flex items-center justify-center text-white text-xs backdrop-blur"
                    title="删除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      {photos.length === 0 && (
        <div className="text-center py-12 text-neutral-500 col-span-full">没有图片</div>
      )}

    </div>
  );
}
