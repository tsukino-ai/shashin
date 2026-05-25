import { useState, useRef, useCallback, useEffect } from 'react';
import WatermarkConfig from './WatermarkConfig';

export default function UploadManager() {
  const [files, setFiles] = useState([]);
  const [watermarkConfig, setWatermarkConfig] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    addFiles(dropped);
  }, []);

  const addFiles = (newFiles) => {
    setFiles((prev) => [
      ...prev,
      ...newFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        status: 'pending', // pending | processing | uploading | done | error
        progress: 0,
        visibility: 'public',
        category: '',
        error: null,
      })),
    ]);
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const setVisibility = (id, visibility) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, visibility } : f)));
  };

  const setCategory = (id, category) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, category } : f)));
  };

  const processAndUpload = async (item) => {
    if (!mountedRef.current) return;

    // Update status to processing
    setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'processing' } : f)));

    // Create Web Worker
    const worker = new Worker('/image-worker.js');

    const result = await new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.success) {
          resolve(e.data);
        } else {
          reject(new Error(e.data.error));
        }
      };
      worker.onerror = reject;
      worker.postMessage({ file: item.file, config: watermarkConfig });
    });

    const blob = new Blob([result.arrayBuffer], { type: 'image/jpeg' });

    worker.terminate();

    if (!mountedRef.current) return;

    // Upload
    setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f)));

    const formData = new FormData();
    formData.append('file', blob, item.name.replace(/\.[^.]+$/, '.jpg'));
    formData.append('visibility', item.visibility);

    const xhr = new XMLHttpRequest();
    xhr.timeout = 120000; // 2 minutes

    await new Promise((resolve, reject) => {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && mountedRef.current) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(xhr.responseText || `Upload failed: ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.ontimeout = () => reject(new Error('Upload timeout'));
      xhr.onabort = () => reject(new Error('Upload aborted'));
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });

    if (mountedRef.current) {
      setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'done', progress: 100 } : f)));
    }
  };

  const startUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);

    const pending = files.filter((f) => f.status === 'pending');
    for (const item of pending) {
      try {
        await processAndUpload(item);
      } catch (err) {
        if (mountedRef.current) {
          setFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, status: 'error', error: err.message } : f))
          );
        }
      }
    }

    setIsUploading(false);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <WatermarkConfig onChange={setWatermarkConfig} />

      {/* Drop Zone */}
      <div
        tabIndex={0}
        role="button"
        aria-label="选择图片文件"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition ${
          isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-700 hover:border-neutral-500'
        }`}
      >
        <p className="text-lg">拖拽图片到这里，或点击选择</p>
        <p className="text-sm text-neutral-500 mt-2">支持 JPG, PNG, WebP（单张最大 25MB）</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((item) => (
            <div key={item.id} className="bg-neutral-800 rounded-lg p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-xs text-neutral-500">{formatSize(item.size)}</span>
                </div>
                <div className="mt-2 h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      item.status === 'error' ? 'bg-red-500' : item.status === 'done' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {item.status === 'pending' && '等待处理'}
                  {item.status === 'processing' && '正在打水印...'}
                  {item.status === 'uploading' && `上传中 ${item.progress}%`}
                  {item.status === 'done' && '完成'}
                  {item.status === 'error' && `错误: ${item.error}`}
                </div>
              </div>

              <input
                type="text"
                placeholder="分类"
                value={item.category || ''}
                onChange={(e) => setCategory(item.id, e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm w-20"
              />
              <select
                value={item.visibility}
                onChange={(e) => setVisibility(item.id, e.target.value)}
                className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
              >
                <option value="public">公开</option>
                <option value="private">私有</option>
              </select>

              <button
                onClick={() => removeFile(item.id)}
                className="text-neutral-500 hover:text-red-400 text-sm"
              >
                删除
              </button>
            </div>
          ))}

          <button
            onClick={startUpload}
            disabled={isUploading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium"
          >
            开始上传 ({files.filter((f) => f.status === 'pending').length} 张待处理)
          </button>
        </div>
      )}
    </div>
  );
}
