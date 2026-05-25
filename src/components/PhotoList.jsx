export default function PhotoList({ photos, selectedKeys, onToggleSelect, onSelectKeys, onDeselectKeys, onEdit }) {
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
    <div className="bg-neutral-800 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-700 text-neutral-400">
            <th className="px-4 py-3 text-left w-10">
              <input
                type="checkbox"
                checked={photos.length > 0 && photos.every((p) => selectedKeys.has(p.key))}
                onChange={(e) => {
                  if (e.target.checked) {
                    onSelectKeys(photos.map((p) => p.key));
                  } else {
                    onDeselectKeys(photos.map((p) => p.key));
                  }
                }}
                className="rounded"
              />
            </th>
            <th className="px-4 py-3 text-left">缩略图</th>
            <th className="px-4 py-3 text-left">文件名</th>
            <th className="px-4 py-3 text-left">分类</th>
            <th className="px-4 py-3 text-left">标签</th>
            <th className="px-4 py-3 text-left">可见性</th>
            <th className="px-4 py-3 text-left">日期</th>
            <th className="px-4 py-3 text-left">大小</th>
            <th className="px-4 py-3 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          {photos.map((photo) => (
            <tr key={photo.key} className="border-b border-neutral-700/50 hover:bg-neutral-700/30">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedKeys.has(photo.key)}
                  onChange={() => onToggleSelect(photo.key)}
                  className="rounded"
                />
              </td>
              <td className="px-4 py-3">
                <a href={photo.src} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photo.thumb}
                    alt=""
                    className="w-14 h-14 object-cover rounded-lg bg-neutral-700 opacity-0 transition-opacity duration-300"
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                  />
                </a>
              </td>
              <td className="px-4 py-3">
                <div className="max-w-[200px] truncate font-mono text-xs text-neutral-300">
                  {photo.key}
                </div>
              </td>
              <td className="px-4 py-3">
                {photo.category && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-700 text-xs">
                    {photo.category}
                  </span>
                )}
              </td>
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
              <td className="px-4 py-3">
                <span className={`text-xs ${photo.visibility === 'private' ? 'text-yellow-400' : 'text-green-400'}`}>
                  {photo.visibility === 'private' ? '私有' : '公开'}
                </span>
              </td>
              <td className="px-4 py-3 text-neutral-400">{photo.dateDisplay}</td>
              <td className="px-4 py-3 text-neutral-400">{photo.sizeDisplay}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(photo)}
                    className="text-xs text-emerald-400 hover:text-emerald-300"
                    title="编辑分类和标签"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleCopy(photo.src)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                    title="复制链接"
                  >
                    复制
                  </button>
                  <button
                    onClick={() => handleDelete(photo.key)}
                    className="text-xs text-red-400 hover:text-red-300"
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {photos.length === 0 && (
        <div className="text-center py-12 text-neutral-500">没有图片</div>
      )}
    </div>
  );
}
