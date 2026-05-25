import { useState, useMemo, useCallback } from 'react';
import PhotoList from './PhotoList';
import PhotoGridManage from './PhotoGridManage';

export default function ManageDashboard({ photos }) {
  const [viewMode, setViewMode] = useState('list');
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterVisibility, setFilterVisibility] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(photos.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    let result = [...photos];
    if (filterCategory !== 'all') {
      result = result.filter((p) => p.category === filterCategory);
    }
    if (filterVisibility !== 'all') {
      result = result.filter((p) => p.visibility === filterVisibility);
    }
    if (sortBy === 'date-desc') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'date-asc') {
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (sortBy === 'size-desc') {
      result.sort((a, b) => b.size - a.size);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.key.localeCompare(b.key));
    }
    return result;
  }, [photos, filterCategory, filterVisibility, sortBy]);

  const totalSize = useMemo(() => photos.reduce((sum, p) => sum + p.size, 0), [photos]);
  const totalSizeDisplay = useMemo(() => {
    if (totalSize < 1024 * 1024) return (totalSize / 1024).toFixed(1) + ' KB';
    return (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
  }, [totalSize]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return photos.filter((p) => p.date && p.date.startsWith(ym)).length;
  }, [photos]);

  const toggleSelect = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedKeys(new Set(filteredPhotos.map((p) => p.key)));
  }, [filteredPhotos]);

  const deselectAll = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  const selectKeys = useCallback((keys) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });
  }, []);

  const deselectKeys = useCallback((keys) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  }, []);

  const handleBatchDelete = async () => {
    if (selectedKeys.size === 0) return;
    setIsDeleting(true);
    const keys = Array.from(selectedKeys);

    async function deleteOne(key) {
      const res = await fetch(`/api/upload?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    }

    // 并发控制：每批 5 个，避免一次性发太多请求
    const batchSize = 5;
    let success = 0;
    let failed = 0;

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((key) => deleteOne(key)));
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          success++;
        } else {
          console.error('Delete failed:', batch[idx], result.reason);
          failed++;
        }
      });
    }

    setIsDeleting(false);
    setShowDeleteModal(false);
    setSelectedKeys(new Set());

    if (failed > 0) {
      alert(`删除完成：成功 ${success} 张，失败 ${failed} 张`);
    }
    window.location.reload();
  };

  const handleCopyLinks = (format) => {
    const selected = filteredPhotos.filter((p) => selectedKeys.has(p.key));
    const text = selected
      .map((p) => {
        if (format === 'markdown') return `![${p.category || 'image'}](${p.src})`;
        return p.src;
      })
      .join('\n');
    navigator.clipboard.writeText(text);
    alert(`已复制 ${selected.length} 条链接`);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-semibold">{photos.length}</div>
          <div className="text-sm text-neutral-500">总张数</div>
        </div>
        <div className="bg-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-semibold">{totalSizeDisplay}</div>
          <div className="text-sm text-neutral-500">总大小</div>
        </div>
        <div className="bg-neutral-800 rounded-lg p-4">
          <div className="text-2xl font-semibold">{thisMonthCount}</div>
          <div className="text-sm text-neutral-500">本月上传</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-neutral-800 rounded-lg p-4">
        {/* View toggle */}
        <div className="flex bg-neutral-900 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            列表
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'}`}
          >
            网格
          </button>
        </div>

        {/* Filters */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm"
        >
          <option value="all">全部分类</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={filterVisibility}
          onChange={(e) => setFilterVisibility(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm"
        >
          <option value="all">全部可见性</option>
          <option value="public">公开</option>
          <option value="private">私有</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm"
        >
          <option value="date-desc">时间从新到旧</option>
          <option value="date-asc">时间从旧到新</option>
          <option value="size-desc">大小从大到小</option>
          <option value="name">文件名</option>
        </select>

        <div className="flex-1" />

        <div className="text-sm text-neutral-500">
          显示 {filteredPhotos.length} 张
        </div>
      </div>

      {/* Batch actions */}
      {selectedKeys.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-900/30 border border-blue-800 rounded-lg p-3">
          <span className="text-sm">已选择 {selectedKeys.size} 张</span>
          <button onClick={selectAll} className="text-sm text-blue-400 hover:text-blue-300">全选</button>
          <button onClick={deselectAll} className="text-sm text-blue-400 hover:text-blue-300">取消</button>
          <div className="flex-1" />
          <button onClick={() => handleCopyLinks('url')} className="text-sm bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded">
            复制链接
          </button>
          <button onClick={() => handleCopyLinks('markdown')} className="text-sm bg-neutral-700 hover:bg-neutral-600 px-3 py-1 rounded">
            复制 Markdown
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-sm bg-red-600 hover:bg-red-500 px-3 py-1 rounded text-white"
          >
            批量删除
          </button>
        </div>
      )}

      {/* Content */}
      {viewMode === 'list' ? (
        <PhotoList photos={filteredPhotos} selectedKeys={selectedKeys} onToggleSelect={toggleSelect} onSelectKeys={selectKeys} onDeselectKeys={deselectKeys} />
      ) : (
        <PhotoGridManage photos={filteredPhotos} selectedKeys={selectedKeys} onToggleSelect={toggleSelect} />
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-2">确认删除</h3>
            <p className="text-neutral-400 mb-6">
              确定要删除选中的 <strong className="text-white">{selectedKeys.size}</strong> 张图片吗？此操作不可恢复。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-sm"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm"
                disabled={isDeleting}
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
