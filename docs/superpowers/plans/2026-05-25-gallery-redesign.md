# 画廊展示优化 + 相册分类 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 升级画廊为 Masonry 瀑布流 + 悬停效果 + 分类标签栏 + 时间线分组

**Architecture:** 纯 CSS columns 实现 Masonry，上传时把分类写入 R2 key 路径，前端解析 key 提取分类列表，顶部标签切换 prefix，全部视图下按年月折叠分组

**Tech Stack:** Astro, Tailwind CSS, PhotoSwipe, R2

---

### Task 1: 上传接口支持分类

**Files:**
- Modify: `src/api/upload.ts`
- Modify: `src/components/UploadManager.jsx`

- [ ] **Step 1: 修改上传接口接收 category 参数**

  在 `src/api/upload.ts` 中，从 formData 读取 `category`，拼入 R2 key：
  ```typescript
  const categoryRaw = (formData.get('category') as string) || 'default';
  const category = categoryRaw.replace(/[^a-zA-Z0-9_-]/g, '');
  const key = `${prefix}${category}/${timestamp}-${uuid}.jpg`;
  ```

- [ ] **Step 2: 上传表单增加分类输入框**

  在 `src/components/UploadManager.jsx` 中，每个文件增加 category 输入：
  ```jsx
  // 在文件列表的 select visibility 旁边加 input
  <input
    type="text"
    placeholder="分类（可选）"
    value={item.category || ''}
    onChange={(e) => setCategory(item.id, e.target.value)}
    className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm w-24"
  />
  ```

  state 中增加 `category` 字段，formData 中 append `category`。

- [ ] **Step 3: Commit**

  ```bash
  git add src/api/upload.ts src/components/UploadManager.jsx
  git commit -m "feat: support category in upload"
  ```

---

### Task 2: Masonry 瀑布流 + 悬停效果 + 懒加载淡入

**Files:**
- Modify: `src/components/PhotoGrid.astro`

- [ ] **Step 1: 重写 PhotoGrid 为 Masonry 布局**

  ```astro
  <div class="masonry" id="gallery">
    {photos.map((photo, i) => (
      <a
        href={photo.src}
        data-pswp-width={photo.w}
        data-pswp-height={photo.h}
        target="_blank"
        rel="noopener noreferrer"
        class="masonry-item group relative block mb-4 overflow-hidden rounded-lg bg-neutral-800"
      >
        <img
          src={photo.thumb}
          alt={photo.alt || `照片 ${i + 1}`}
          loading="lazy"
          width={photo.w}
          height={photo.h}
          class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03] opacity-0 animate-fade-in"
          onload="this.classList.remove('opacity-0')"
        />
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p class="text-xs text-white/90">{photo.date || ''}</p>
          <p class="text-[10px] text-white/60">{photo.category || ''}</p>
        </div>
      </a>
    ))}
  </div>

  <style>
    .masonry {
      columns: 2;
      column-gap: 1rem;
    }
    .masonry-item {
      break-inside: avoid;
    }
    @media (min-width: 768px) {
      .masonry { columns: 3; }
    }
    @media (min-width: 1024px) {
      .masonry { columns: 4; }
    }
    .animate-fade-in {
      transition: opacity 0.5s ease-out;
    }
  </style>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/PhotoGrid.astro
  git commit -m "feat: masonry layout with hover overlay and fade-in"
  ```

---

### Task 3: CategoryNav 分类导航组件

**Files:**
- Create: `src/components/CategoryNav.astro`

- [ ] **Step 1: 创建分类导航组件**

  ```astro
  ---
  interface Props {
    categories: string[];
    active: string;
    basePath: string;
  }
  const { categories, active, basePath } = Astro.props;
  ---

  <nav class="flex gap-2 mb-6 overflow-x-auto pb-2">
    <a
      href={basePath}
      class={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition ${active === 'all' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
    >
      全部
    </a>
    {categories.map((cat) => (
      <a
        href={`${basePath}?category=${cat}`}
        class={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition ${active === cat ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
      >
        {cat}
      </a>
    ))}
  </nav>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/CategoryNav.astro
  git commit -m "feat: add category navigation component"
  ```

---

### Task 4: 改造 GalleryPage 支持分类和时间线

**Files:**
- Modify: `src/components/GalleryPage.astro`

- [ ] **Step 1: 重写 GalleryPage 支持分类筛选和时间线分组**

  主要改动：
  1. 从 `Astro.url.searchParams` 读取 `category` 参数
  2. 调用 `bucket.list({ prefix })` 获取图片
  3. 解析所有 key 提取分类列表（去掉时间线分组外的逻辑，先支持分类切换）
  4. 如果 category 为全部，按年月分组渲染
  5. 渲染 CategoryNav + PhotoGrid

  ```astro
  ---
  import { env } from 'cloudflare:workers';
  import Layout from '../layouts/Layout.astro';
  import PhotoGrid from './PhotoGrid.astro';
  import CategoryNav from './CategoryNav.astro';

  export interface Props {
    title: string;
    heading: string;
    prefix: string;
  }

  const { title, heading, prefix } = Astro.props;
  const category = Astro.url.searchParams.get('category') || 'all';

  let photos: any[] = [];
  let categories: string[] = [];
  let error: string | null = null;

  try {
    const bucket = env.GALARY_BUCKET;
    if (bucket) {
      // 列出所有对象以提取分类
      const allListed = await bucket.list({ prefix });
      const allObjects = allListed.objects || [];

      // 提取分类：从 key 中解析 {prefix}{category}/... 的结构
      const catSet = new Set<string>();
      allObjects.forEach((obj) => {
        const relativeKey = obj.key.slice(prefix.length); // 去掉 public/ 或 private/
        const firstSlash = relativeKey.indexOf('/');
        if (firstSlash > 0) {
          catSet.add(relativeKey.slice(0, firstSlash));
        }
      });
      categories = Array.from(catSet).sort();

      // 按分类筛选
      const targetPrefix = category === 'all' ? prefix : `${prefix}${category}/`;
      const listed = await bucket.list({ prefix: targetPrefix });
      photos = (listed.objects || []).map((obj) => {
        const publicUrl = `https://cdn.tsukino.dev/${obj.key}`;
        // 从 key 解析分类和日期
        const relativeKey = obj.key.slice(prefix.length);
        const parts = relativeKey.split('/');
        const cat = parts.length > 1 ? parts[0] : '';
        const uploaded = obj.uploaded ? new Date(obj.uploaded) : null;
        return {
          src: publicUrl,
          thumb: publicUrl,
          w: 2000,
          h: 3000,
          category: cat,
          date: uploaded ? uploaded.toLocaleDateString('zh-CN') : '',
          yearMonth: uploaded ? `${uploaded.getFullYear()}-${String(uploaded.getMonth() + 1).padStart(2, '0')}` : '',
        };
      });
    } else {
      error = 'GALARY_BUCKET is undefined';
    }
  } catch (e: any) {
    error = e?.message || String(e);
  }

  // 按年月分组（仅在全部视图下）
  let groupedPhotos: Record<string, typeof photos> = {};
  if (category === 'all') {
    photos.forEach((p) => {
      const ym = p.yearMonth || '未知时间';
      if (!groupedPhotos[ym]) groupedPhotos[ym] = [];
      groupedPhotos[ym].push(p);
    });
  }
  const sortedMonths = Object.keys(groupedPhotos).sort().reverse();
  ---

  <Layout title={title}>
    <h1 class="text-3xl font-light mb-4">{heading}</h1>
    <CategoryNav categories={categories} active={category} basePath={Astro.url.pathname} />
    {error && <p class="text-red-400 text-center py-8">{error}</p>}

    {category === 'all' ? (
      <div class="space-y-8">
        {sortedMonths.map((month) => (
          <details open class="group">
            <summary class="flex items-center gap-2 cursor-pointer text-lg font-medium text-neutral-300 mb-4 select-none">
              <span class="transition-transform group-open:rotate-90">▶</span>
              {month}
              <span class="text-sm text-neutral-500">({groupedPhotos[month].length} 张)</span>
            </summary>
            <PhotoGrid photos={groupedPhotos[month]} />
          </details>
        ))}
      </div>
    ) : (
      <PhotoGrid photos={photos} />
    )}
  </Layout>
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/GalleryPage.astro
  git commit -m "feat: gallery supports category filter and timeline grouping"
  ```

---

### Task 5: 更新全局样式和构建验证

**Files:**
- Modify: `src/styles/global.css`（如需要添加 fade-in 动画）
- 构建验证

- [ ] **Step 1: 确保全局样式已包含必要基础**

  检查 `src/styles/global.css`，确认有 tailwind 基础导入。PhotoGrid 的 `<style>` 标签已包含 Masonry 样式，不需要全局修改。

- [ ] **Step 2: 构建验证**

  ```bash
  npm run build
  ```

  预期：构建成功，无错误。

- [ ] **Step 3: Commit**

  ```bash
  git add -A
  git commit -m "chore: build verification for gallery redesign"
  ```

---

## Self-Review

1. **Spec coverage:**
   - ✅ Masonry 瀑布流 → Task 2
   - ✅ 悬停效果 → Task 2
   - ✅ 懒加载淡入 → Task 2
   - ✅ 分类系统 → Task 1 + Task 3 + Task 4
   - ✅ 时间线分组 → Task 4
   - ✅ 保留 PhotoSwipe → PhotoGrid 中保留 data-pswp 属性

2. **Placeholder scan:** 无 TBD/TODO，所有步骤含完整代码。

3. **Type consistency:** `category` 字段在 upload.ts 和 UploadManager.jsx 中一致。
