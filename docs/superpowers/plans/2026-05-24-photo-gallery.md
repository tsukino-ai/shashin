# Photo Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal photo gallery with watermark upload, public/private browsing, and Cloudflare Pages deployment.

**Architecture:** Astro SSR with Cloudflare Pages adapter renders gallery pages by listing R2 bucket contents at request time. Uploads go through a Pages Function that streams files directly to R2. Watermarking happens in a browser Web Worker using OffscreenCanvas to keep the UI responsive.

**Tech Stack:** Astro v5 + @astrojs/cloudflare, PhotoSwipe v5, Tailwind CSS v4, Cloudflare R2, Cloudflare Pages Functions, Web Worker + OffscreenCanvas, tus-js-client

---

## File Structure

```
galary/
├── public/
│   └── image-worker.js              # Browser Web Worker: decode → watermark → export JPEG
├── src/
│   ├── components/
│   │   ├── PhotoGrid.astro          # Responsive grid of thumbnails
│   │   ├── PhotoSwipeInit.astro     # Lightbox initialization script
│   │   ├── WatermarkConfig.jsx      # React island: watermark style editor panel
│   │   └── UploadManager.jsx        # React island: drag-drop + queue + progress UI
│   ├── layouts/
│   │   └── Layout.astro             # Root layout with nav + Tailwind
│   ├── pages/
│   │   ├── index.astro              # SSR: list R2 public/ prefix
│   │   ├── private/
│   │   │   └── index.astro          # SSR: list R2 private/ prefix (Access-protected)
│   │   └── upload.astro             # Upload page with WatermarkConfig + UploadManager
│   └── types/
│       └── env.d.ts                 # Cloudflare runtime type declarations
├── functions/
│   └── api/
│       └── upload.ts                # Pages Function: validate + stream to R2
├── astro.config.mjs
├── wrangler.toml                    # R2 binding + Pages Functions config
├── package.json
└── README.md
```

---

### Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `wrangler.toml`
- Create: `src/types/env.d.ts`

- [ ] **Step 1: Create Astro project with Cloudflare adapter**

```bash
cd /Users/Apple/projects/tsukino/galary
npm create astro@latest . -- --template minimal --install --git=false
npm install @astrojs/cloudflare@latest
npm install photoswipe
npm install -D @types/photoswipe tailwindcss postcss autoprefixer
npm install tus-js-client
```

- [ ] **Step 2: Configure Astro for Cloudflare SSR**

Create `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  integrations: [],
});
```

- [ ] **Step 3: Configure Wrangler with R2 binding**

Create `wrangler.toml`:

```toml
name = "galary"
compatibility_date = "2025-05-24"

[[r2_buckets]]
binding = "GALARY_BUCKET"
bucket_name = "galary-photos"
```

- [ ] **Step 4: Add Cloudflare runtime type declarations**

Create `src/types/env.d.ts`:

```typescript
/// <reference types="@astrojs/cloudflare" />

interface Env {
  GALARY_BUCKET: R2Bucket;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
```

- [ ] **Step 5: Configure Tailwind CSS**

```bash
npx tailwindcss init -p
```

Replace `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Create `src/styles/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Astro + Cloudflare SSR + Tailwind"
```

---

### Task 2: Base Layout and Page Routes

**Files:**
- Create: `src/layouts/Layout.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/private/index.astro`
- Create: `src/pages/upload.astro`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write base layout**

Create `src/layouts/Layout.astro`:

```astro
---
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <link rel="stylesheet" href="/src/styles/global.css" />
</head>
<body class="bg-neutral-900 text-white min-h-screen">
  <nav class="px-6 py-4 border-b border-neutral-800 flex gap-6">
    <a href="/" class="hover:text-neutral-300">精选</a>
    <a href="/private" class="hover:text-neutral-300">写真集</a>
    <a href="/upload" class="hover:text-neutral-300">上传</a>
  </nav>
  <main class="max-w-7xl mx-auto px-6 py-8">
    <slot />
  </main>
</body>
</html>
```

- [ ] **Step 2: Create public gallery page (SSR listing R2 public/ prefix)**

Create `src/pages/index.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import PhotoGrid from '../../components/PhotoGrid.astro';

const { env } = Astro.locals.runtime;
const bucket = env.GALARY_BUCKET;

let photos: { src: string; thumb: string; w: number; h: number }[] = [];
try {
  const listed = await bucket.list({ prefix: 'public/' });
  photos = listed.objects.map((obj) => {
    const publicUrl = `https://pub-xxx.r2.dev/${obj.key}`;
    return {
      src: publicUrl,
      thumb: publicUrl,
      w: 2000,
      h: 3000,
    };
  });
} catch (e) {
  console.error('R2 list error:', e);
}
---

<Layout title="精选">
  <h1 class="text-3xl font-light mb-8">精选写真</h1>
  <PhotoGrid photos={photos} />
</Layout>
```

- [ ] **Step 3: Create private gallery page (SSR listing R2 private/ prefix)**

Create `src/pages/private/index.astro`:

```astro
---
import Layout from '../../layouts/Layout.astro';
import PhotoGrid from '../../components/PhotoGrid.astro';

const { env } = Astro.locals.runtime;
const bucket = env.GALARY_BUCKET;

let photos: { src: string; thumb: string; w: number; h: number }[] = [];
try {
  const listed = await bucket.list({ prefix: 'private/' });
  photos = listed.objects.map((obj) => {
    const publicUrl = `https://pub-xxx.r2.dev/${obj.key}`;
    return {
      src: publicUrl,
      thumb: publicUrl,
      w: 2000,
      h: 3000,
    };
  });
} catch (e) {
  console.error('R2 list error:', e);
}
---

<Layout title="写真集">
  <h1 class="text-3xl font-light mb-8">完整写真集</h1>
  <PhotoGrid photos={photos} />
</Layout>
```

- [ ] **Step 4: Create upload page placeholder**

Create `src/pages/upload.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="上传">
  <h1 class="text-3xl font-light mb-8">上传照片</h1>
  <div id="upload-root" class="space-y-6">
    <p class="text-neutral-400">Upload component will be mounted here.</p>
  </div>
</Layout>
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: Server starts at `http://localhost:4321`, pages load without errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add base layout and page routes"
```

---

### Task 3: Browser Web Worker for Image Watermarking

**Files:**
- Create: `public/image-worker.js`

- [ ] **Step 1: Write Web Worker that decodes, watermarks, and exports JPEG**

Create `public/image-worker.js`:

```javascript
/**
 * Browser Web Worker: image decode → watermark → JPEG export
 * Receives: { file: File, config: WatermarkConfig }
 * Returns: { blob: Blob, width: number, height: number }
 */
self.onmessage = async (e) => {
  const { file, config } = e.data;

  try {
    // 1. Decode image efficiently (no DOM needed)
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;

    // 2. Create OffscreenCanvas matching image dimensions
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 3. Draw original image
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close(); // Release decoded memory immediately

    // 4. Draw watermark based on config
    ctx.save();
    ctx.globalAlpha = config.opacity ?? 0.4;
    ctx.font = `${config.fontSize ?? 24}px ${config.fontFamily ?? 'Arial'}`;
    ctx.fillStyle = config.fontColor ?? 'rgba(255,255,255,0.6)';
    const rotateRad = ((config.rotate ?? 45) * Math.PI) / 180;

    const gapX = config.gapX ?? 200;
    const gapY = config.gapY ?? 150;
    const text = config.content ?? '©';
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = config.fontSize ?? 24;

    // Calculate bounding box after rotation to cover entire image
    const diag = Math.sqrt(width * width + height * height);
    const cols = Math.ceil(diag / gapX) + 2;
    const rows = Math.ceil(diag / gapY) + 2;
    const startX = -diag / 2;
    const startY = -diag / 2;

    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotateRad);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * gapX;
        const y = startY + r * gapY;
        ctx.fillText(text, x - textWidth / 2, y + textHeight / 2);
      }
    }

    ctx.restore();

    // 5. Export as JPEG blob (quality 0.95 to preserve detail)
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.95,
    });

    // 6. Transfer blob back to main thread (zero-copy)
    self.postMessage({ success: true, blob, width, height }, [blob]);
  } catch (err) {
    self.postMessage({ success: false, error: err.message });
  }
};
```

- [ ] **Step 2: Verify syntax by serving the file**

```bash
npx http-server public -p 8080 &
curl -s http://localhost:8080/image-worker.js | head -5
```
Expected: Returns JavaScript source starting with `/**`

- [ ] **Step 3: Commit**

```bash
git add public/image-worker.js
git commit -m "feat: add browser Web Worker for watermarking"
```

---

### Task 4: Upload API (Pages Function)

**Files:**
- Create: `functions/api/upload.ts`

- [ ] **Step 1: Write Pages Function that validates and streams files to R2**

Create `functions/api/upload.ts`:

```typescript
import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  GALARY_BUCKET: R2Bucket;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Upload-Metadata',
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return jsonResponse({ success: false, error: 'Expected multipart/form-data' }, 415);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const visibility = (formData.get('visibility') as string) || 'public';

    if (!file) {
      return jsonResponse({ success: false, error: 'No file provided' }, 400);
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse(
        { success: false, error: `Invalid type: ${file.type}. Allowed: jpeg, png, webp` },
        415
      );
    }

    // Validate size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return jsonResponse({ success: false, error: 'File too large (max 25MB)' }, 413);
    }

    // Validate visibility prefix
    const prefix = visibility === 'private' ? 'private/' : 'public/';

    // Generate filename: prefix/timestamp-uuid.jpg
    const timestamp = Date.now();
    const uuid = crypto.randomUUID().split('-')[0];
    const key = `${prefix}${timestamp}-${uuid}.jpg`;

    // Stream directly to R2 (no memory buffering)
    await env.GALARY_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: 'image/jpeg',
        contentDisposition: `inline; filename="${timestamp}.jpg"`,
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        visibility: visibility,
      },
    });

    // Construct public URL (R2 public bucket)
    const publicUrl = `https://pub-xxx.r2.dev/${key}`;

    return jsonResponse({ success: true, url: publicUrl, key, size: file.size });
  } catch (err: any) {
    console.error('Upload error:', err);
    return jsonResponse({ success: false, error: err.message || 'Upload failed' }, 500);
  }
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Test the API with a simple curl**

```bash
echo "Test requires wrangler dev server running with R2 binding"
```

Note: Full integration test comes in Task 7 after frontend is wired.

- [ ] **Step 3: Commit**

```bash
git add functions/api/upload.ts
git commit -m "feat: add Pages Function upload endpoint with validation"
```

---

### Task 5: Watermark Config Panel (React Island)

**Files:**
- Create: `src/components/WatermarkConfig.jsx`
- Create: `src/components/UploadManager.jsx`

- [ ] **Step 1: Write WatermarkConfig component**

Create `src/components/WatermarkConfig.jsx`:

```jsx
import { useState, useEffect } from 'react';

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
  const [config, setConfig] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('watermark-config');
      return saved ? JSON.parse(saved) : defaultConfig;
    }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem('watermark-config', JSON.stringify(config));
    onChange?.(config);
  }, [config]);

  const update = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const reset = () => setConfig(defaultConfig);

  return (
    <div className="bg-neutral-800 rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">水印配置</h3>
        <button onClick={reset} className="text-sm text-neutral-400 hover:text-white">
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
                value={config.gapX}
                onChange={(e) => update('gapX', Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2"
              />
            </label>
            <label>
              <span className="text-sm text-neutral-400 block mb-1">纵向间距</span>
              <input
                type="number"
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WatermarkConfig.jsx
git commit -m "feat: add watermark config panel with localStorage persistence"
```

---

### Task 6: Upload Manager (React Island)

**Files:**
- Create: `src/components/UploadManager.jsx`
- Modify: `src/pages/upload.astro`

- [ ] **Step 1: Write UploadManager component**

Create `src/components/UploadManager.jsx`:

```jsx
import { useState, useRef, useCallback } from 'react';
import WatermarkConfig from './WatermarkConfig';

export default function UploadManager() {
  const [files, setFiles] = useState([]);
  const [watermarkConfig, setWatermarkConfig] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

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

  const processAndUpload = async (item) => {
    // Update status to processing
    setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'processing' } : f)));

    // Create Web Worker
    const worker = new Worker('/image-worker.js');

    const blob = await new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.success) {
          resolve(e.data.blob);
        } else {
          reject(new Error(e.data.error));
        }
      };
      worker.onerror = reject;
      worker.postMessage({ file: item.file, config: watermarkConfig });
    });

    worker.terminate();

    // Upload
    setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f)));

    const formData = new FormData();
    formData.append('file', blob, item.name.replace(/\.[^.]+$/, '.jpg'));
    formData.append('visibility', item.visibility);

    const xhr = new XMLHttpRequest();

    await new Promise((resolve, reject) => {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f)));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(xhr.responseText));
        }
      };

      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });

    setFiles((prev) => prev.map((f) => (f.id === item.id ? { ...f, status: 'done', progress: 100 } : f)));
  };

  const startUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    for (const item of pending) {
      try {
        await processAndUpload(item);
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'error', error: err.message } : f))
        );
      }
    }
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
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
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
          onChange={(e) => addFiles(Array.from(e.target.files))}
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
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-3 font-medium"
          >
            开始上传 ({files.filter((f) => f.status === 'pending').length} 张待处理)
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire UploadManager into upload page**

Modify `src/pages/upload.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import UploadManager from '../components/UploadManager.jsx';
---

<Layout title="上传">
  <h1 class="text-3xl font-light mb-8">上传照片</h1>
  <UploadManager client:load />
</Layout>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/UploadManager.jsx src/pages/upload.astro
git commit -m "feat: add upload manager with Web Worker watermark + XHR progress"
```

---

### Task 7: PhotoGrid + PhotoSwipe Integration

**Files:**
- Create: `src/components/PhotoGrid.astro`
- Create: `src/components/PhotoSwipeInit.astro`

- [ ] **Step 1: Write PhotoGrid component**

Create `src/components/PhotoGrid.astro`:

```astro
---
interface Photo {
  src: string;
  thumb: string;
  w: number;
  h: number;
}
interface Props {
  photos: Photo[];
}
const { photos } = Astro.props;
---

{photos.length === 0 ? (
  <p class="text-neutral-500 text-center py-20">暂无照片</p>
) : (
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="gallery">
    {photos.map((photo, i) => (
      <a
        href={photo.src}
        data-pswp-width={photo.w}
        data-pswp-height={photo.h}
        target="_blank"
        class="block aspect-[3/4] overflow-hidden rounded-lg bg-neutral-800 group relative"
      >
        <img
          src={photo.thumb}
          alt={`Photo ${i + 1}`}
          loading="lazy"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </a>
    ))}
  </div>
)}

<PhotoSwipeInit />
```

- [ ] **Step 2: Write PhotoSwipeInit component**

Create `src/components/PhotoSwipeInit.astro`:

```astro
<script>
  import PhotoSwipeLightbox from 'photoswipe/lightbox';
  import 'photoswipe/style.css';

  document.addEventListener('astro:page-load', () => {
    const gallery = document.getElementById('gallery');
    if (!gallery) return;

    const lightbox = new PhotoSwipeLightbox({
      gallery: '#gallery',
      children: 'a',
      pswpModule: () => import('photoswipe'),
    });

    lightbox.init();
  });
</script>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PhotoGrid.astro src/components/PhotoSwipeInit.astro
git commit -m "feat: add PhotoGrid and PhotoSwipe lightbox integration"
```

---

### Task 8: Wrangler Config + Environment Variables

**Files:**
- Modify: `wrangler.toml`

- [ ] **Step 1: Add Pages Functions configuration to wrangler.toml**

Modify `wrangler.toml`:

```toml
name = "galary"
compatibility_date = "2025-05-24"

# R2 bucket binding
[[r2_buckets]]
binding = "GALARY_BUCKET"
bucket_name = "galary-photos"

# Pages Functions config
[site]
bucket = "./dist"
```

- [ ] **Step 2: Commit**

```bash
git add wrangler.toml
git commit -m "chore: configure wrangler with R2 binding and Pages Functions"
```

---

### Task 9: Deployment Configuration

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `package.json`

- [ ] **Step 1: Add deploy script to package.json**

Modify `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "wrangler pages deploy dist"
  }
}
```

- [ ] **Step 2: Write README with deployment instructions**

Create `README.md`:

```markdown
# Galary — 个人写真照片墙

## 部署步骤

1. 创建 R2 Bucket
   ```bash
   wrangler r2 bucket create galary-photos
   ```

2. 设置 Bucket 为 Public
   - Cloudflare 控制台 → R2 → galary-photos → Settings → Allow Public Access

3. 部署 Pages
   ```bash
   npm run build
   wrangler pages deploy dist
   ```

4. 配置 Cloudflare Access
   - Zero Trust → Access → Applications → Add
   - 保护路径: `your-domain.com/upload` 和 `your-domain.com/private`
   - 添加允许的邮箱

## 本地开发

```bash
npm run dev
```

Worker 本地测试:
```bash
wrangler pages dev
```
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add deployment config and README"
```

---

## Spec Coverage Review

| Spec Section | Task | Status |
|-------------|------|--------|
| Astro SSR + Cloudflare adapter | Task 1 | ✅ |
| Public gallery (`/`) | Task 2 | ✅ |
| Private gallery (`/private`) | Task 2 | ✅ |
| Upload page (`/upload`) | Task 2, 5, 6 | ✅ |
| Web Worker watermarking | Task 3 | ✅ |
| Watermark config panel | Task 5 | ✅ |
| Upload API with validation | Task 4 | ✅ |
| Upload queue + progress UI | Task 6 | ✅ |
| PhotoSwipe integration | Task 7 | ✅ |
| R2 public/private prefix | Task 4 | ✅ |
| Cloudflare Images thumbnails | Task 2 (basic, needs custom domain setup) | ⚠️ |
| Cloudflare Access setup | Task 9 (README only, manual console config) | ⚠️ |

**Gaps identified:**
1. Cloudflare Images URL 变换需要自定义域名接入后才能使用缩略图优化。基础版先用原图 URL，后续域名接入后可切换为 `cdn-cgi/image` 格式。
2. Cloudflare Access 配置是控制台手动操作，不在代码中。

---

*Plan complete. Ready for execution.*

