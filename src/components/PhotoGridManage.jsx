export default function PhotoGridManage({ photos, selectedKeys, onToggleSelect }) {
  const handleCopy = (src) => {
    navigator.clipboard.writeText(src);
  };

  const handleDelete = async (key) => {
    if (!confirm('确定删除这张图片？')) return;
    try {
      await fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      window.location.reload();
    } catch (err) {
      alert('删除失败: ' + String(err));
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
                className="w-full h-auto object-cover"
                loading="lazy"
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
                <div className="text-xs text-white/80 truncate max-w-[60%]">
                  {photo.category && <span className="mr-2">{photo.category}</span>}
                  <span className="text-white/50">{photo.sizeDisplay}</span>
                </div>
                <div className="flex gap-2">
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
