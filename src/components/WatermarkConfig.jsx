import { useState, useEffect, useRef } from 'react';

const defaultConfig = {
  content: '© YourName',
  fontSize: 24,
  fontColor: 'rgba(255, 255, 255, 0.4)',
  fontFamily: 'Arial',
  opacity: 0.4,
  rotate: 45,
  gapX: 200,
  gapY: 150,
  mode: 'repeat', // 'repeat' | 'corner' | 'center'
};

export default function WatermarkConfig({ onChange }) {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const [config, setConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('watermark-config');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Basic schema validation
          if (parsed && typeof parsed === 'object' && 'mode' in parsed) {
            return parsed;
          }
        }
      } catch {
        // ignore corrupt localStorage
      }
    }
    return { ...defaultConfig };
  });

  useEffect(() => {
    localStorage.setItem('watermark-config', JSON.stringify(config));
    onChangeRef.current?.(config);
  }, [config]);

  const update = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setConfig({ ...defaultConfig });

  return (
    <div className="bg-neutral-800 rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">水印配置</h3>
        <button type="button" onClick={reset} className="text-sm text-neutral-400 hover:text-white">
          恢复默认
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="col-span-2">
          <span className="text-sm text-neutral-400 block mb-1">文字内容</span>
          <input
            type="text"
            value={config.content}
            onChange={(e) => update('content', e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </label>

        <label>
          <span className="text-sm text-neutral-400 block mb-1">字号 (px)</span>
          <input
            type="number"
            min="1"
            max="200"
            value={config.fontSize}
            onChange={(e) => update('fontSize', Number(e.target.value))}
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </label>

        <label>
          <span className="text-sm text-neutral-400 block mb-1">透明度</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.opacity}
            onChange={(e) => update('opacity', Number(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-neutral-500">{Math.round(config.opacity * 100)}%</span>
        </label>

        <label>
          <span className="text-sm text-neutral-400 block mb-1">旋转角度</span>
          <input
            type="number"
            min="-360"
            max="360"
            value={config.rotate}
            onChange={(e) => update('rotate', Number(e.target.value))}
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          />
        </label>

        <label>
          <span className="text-sm text-neutral-400 block mb-1">模式</span>
          <select
            value={config.mode}
            onChange={(e) => update('mode', e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
          >
            <option value="repeat">全图平铺</option>
            <option value="corner">右下角单点</option>
            <option value="center">居中</option>
          </select>
        </label>

        {config.mode === 'repeat' && (
          <>
            <label>
              <span className="text-sm text-neutral-400 block mb-1">横向间距</span>
              <input
                type="number"
                min="1"
                max="2000"
                value={config.gapX}
                onChange={(e) => update('gapX', Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
              />
            </label>
            <label>
              <span className="text-sm text-neutral-400 block mb-1">纵向间距</span>
              <input
                type="number"
                min="1"
                max="2000"
                value={config.gapY}
                onChange={(e) => update('gapY', Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
              />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
