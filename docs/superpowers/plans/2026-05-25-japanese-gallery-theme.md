# 日系多风格写真主题系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 Astro 写真站实现 CSS 变量驱动的四套日系主题系统（Lolita/JK/地雷系/清楚系），含风格化导航、主题化照片卡片、背景纹理和字体。

**Architecture:** 统一页面骨架通过 `data-theme` 属性切换 CSS 自定义属性，Tailwind v4 `@theme` 扩展消费这些变量。分类与主题的映射在 GalleryPage 中处理，默认路由展示 Lolita 主题。

**Tech Stack:** Astro 6, Tailwind CSS v4, Google Fonts, PhotoSwipe (保留)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/styles/themes.css` | Create | 四套主题的 CSS 变量、纹理、data-theme 选择器 |
| `src/styles/global.css` | Modify | 添加 `@theme` 扩展，导入 themes.css |
| `src/layouts/Layout.astro` | Modify | data-theme 属性、Google Fonts、body 背景 |
| `src/components/CategoryNav.astro` | Modify | 风格化标签导航，主题化样式 |
| `src/components/PhotoGrid.astro` | Modify | 主题化卡片样式、装饰元素 |
| `src/components/GalleryPage.astro` | Modify | 分类→主题映射、默认 Lolita、移除精选 |
| `src/pages/index.astro` | Modify | 默认加载 Lolita 内容 |

---

## Task 1: 创建主题 CSS 变量文件

**Files:**
- Create: `src/styles/themes.css`

- [ ] **Step 1: 创建 themes.css，定义四套主题变量**

```css
/* src/styles/themes.css */

/* ========== Base (Lolita - default) ========== */
:root,
[data-theme="lolita"] {
  --bg: #f5e6d3;
  --bg-texture: rgba(139, 69, 19, 0.04);
  --text: #5c3a1e;
  --text-muted: #8b7355;
  --primary: #8b4513;
  --accent: #c17817;
  --card-bg: #fffbf5;
  --card-border: #e8d5c0;
  --card-radius: 4px;
  --card-shadow: 0 4px 12px rgba(139, 69, 19, 0.12);
  --nav-active-bg: #8b4513;
  --nav-active-text: #f5e6d3;
  --nav-inactive-bg: #e8d5c0;
  --nav-inactive-text: #5c3a1e;
  --font-heading: 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif;
  --font-body: 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif;
}

/* ========== JK ========== */
[data-theme="jk"] {
  --bg: #e8f4f8;
  --bg-texture: rgba(44, 95, 124, 0.03);
  --text: #2c5f7c;
  --text-muted: #5ba3c0;
  --primary: #2c5f7c;
  --accent: #5ba3c0;
  --card-bg: #ffffff;
  --card-border: #c0dce8;
  --card-radius: 8px;
  --card-shadow: 0 2px 8px rgba(44, 95, 124, 0.1);
  --nav-active-bg: #2c5f7c;
  --nav-active-text: #ffffff;
  --nav-inactive-bg: #c0dce8;
  --nav-inactive-text: #2c5f7c;
  --font-heading: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif;
  --font-body: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif;
}

/* ========== 地雷系 (Jirai) ========== */
[data-theme="jirai"] {
  --bg: #1a0a12;
  --bg-texture: rgba(255, 105, 180, 0.02);
  --text: #e8c8d8;
  --text-muted: #b080a0;
  --primary: #ff69b4;
  --accent: #ff1493;
  --card-bg: #2d1a22;
  --card-border: #ff69b4;
  --card-radius: 0px;
  --card-shadow: 0 0 16px rgba(255, 105, 180, 0.2);
  --nav-active-bg: #ff69b4;
  --nav-active-text: #1a0a12;
  --nav-inactive-bg: #2d1a22;
  --nav-inactive-text: #ff69b4;
  --font-heading: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif;
  --font-body: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif;
}

/* ========== 清楚系 (Seiso) ========== */
[data-theme="seiso"] {
  --bg: #fff5f7;
  --bg-texture: rgba(212, 165, 165, 0.03);
  --text: #8a7070;
  --text-muted: #b8a0a0;
  --primary: #d4a5a5;
  --accent: #e8c4c4;
  --card-bg: #ffffff;
  --card-border: #f0d5d8;
  --card-radius: 16px;
  --card-shadow: 0 2px 12px rgba(212, 165, 165, 0.1);
  --nav-active-bg: #d4a5a5;
  --nav-active-text: #ffffff;
  --nav-inactive-bg: #ffffff;
  --nav-inactive-text: #d4a5a5;
  --font-heading: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif;
  --font-body: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif;
}

/* ========== Background textures ========== */
[data-theme="lolita"] body::after {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 35px,
    var(--primary) 35px,
    var(--primary) 70px
  );
  opacity: 0.04;
}

[data-theme="jk"] body::after {
  background-image: radial-gradient(
    circle at 30% 30%,
    var(--primary) 0.5px,
    transparent 0.5px
  );
  background-size: 40px 40px;
  opacity: 0.03;
}

[data-theme="jirai"] body::after {
  background-image: radial-gradient(
      circle at 20% 50%,
      var(--primary) 1px,
      transparent 1px
    ),
    radial-gradient(circle at 80% 80%, var(--primary) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.02;
}

[data-theme="seiso"] body::after {
  background: radial-gradient(ellipse at 30% 20%, #ffd0d8 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, #d0e8ff 0%, transparent 50%);
  opacity: 0.03;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/themes.css
git commit -m "feat: add four Japanese theme CSS variable definitions"
```

---

## Task 2: 扩展 Tailwind 主题配置

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 修改 global.css，添加 @theme 扩展并导入 themes.css**

```css
/* src/styles/global.css */
@import "tailwindcss";
@import "./themes.css";

@theme {
  --color-theme-bg: var(--bg);
  --color-theme-text: var(--text);
  --color-theme-text-muted: var(--text-muted);
  --color-theme-primary: var(--primary);
  --color-theme-accent: var(--accent);
  --color-theme-card: var(--card-bg);
  --color-theme-card-border: var(--card-border);
  --font-theme-heading: var(--font-heading);
  --font-theme-body: var(--font-body);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: extend Tailwind theme with CSS custom properties"
```

---

## Task 3: 改造 Layout 组件

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: 修改 Layout.astro，添加 data-theme、Google Fonts、背景层，保留全局导航**

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  theme?: string;
}
const { title, theme = 'lolita' } = Astro.props;
---

<!DOCTYPE html>
<html lang="zh-CN" data-theme={theme}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&family=Zen+Kaku+Gothic+New:wght@300;400;700&family=Zen+Maru+Gothic:wght@400;700&display=swap"
    rel="stylesheet"
  />
</head>
<body class="min-h-screen" style="font-family: var(--font-body); color: var(--text); background-color: var(--bg);">
  <!-- Global navigation -->
  <nav class="px-6 py-4" style="border-bottom: 1px solid var(--card-border);">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-6">
        <a href="/" class="text-lg font-semibold" style="font-family: var(--font-heading); color: var(--primary);">Tsukino Gallery</a>
        <div class="flex gap-4 text-sm">
          <a href="/" class="transition-opacity hover:opacity-80" style="color: var(--text);">写真</a>
          <a href="/upload" class="transition-opacity hover:opacity-80" style="color: var(--text-muted);">上传</a>
          <a href="/manage" class="transition-opacity hover:opacity-80" style="color: var(--text-muted);">管理</a>
        </div>
      </div>
    </div>
  </nav>
  <main class="max-w-7xl mx-auto px-6 py-8">
    <slot />
  </main>
</body>
</html>

<style is:global>
  body::before,
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }
  body::before {
    background-color: var(--bg);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add data-theme, Google Fonts, and themed background to Layout"
```

---

## Task 4: 改造 CategoryNav 为风格化标签导航

**Files:**
- Modify: `src/components/CategoryNav.astro`

- [ ] **Step 1: 重写 CategoryNav，使用动态分类 + 映射表 + 主题化标签样式**

```astro
---
interface Props {
  categories: string[];
  active: string;
  basePath: string;
}
const { categories, active, basePath } = Astro.props;

// Map directory names to theme keys and display labels
const categoryToTheme: Record<string, string> = {
  lolita: 'lolita',
  jk: 'jk',
  jirai: 'jirai',
  seiso: 'seiso',
  '地雷系': 'jirai',
  '清楚系': 'seiso',
};

const categoryToLabel: Record<string, string> = {
  lolita: '🎀 Lolita',
  jk: '🌸 JK',
  jirai: '🖤💗 地雷系',
  seiso: '🤍 清楚系',
  '地雷系': '🖤💗 地雷系',
  '清楚系': '🤍 清楚系',
};

function getLabel(cat: string): string {
  return categoryToLabel[cat] || cat;
}

function getHref(cat: string): string {
  return cat === 'lolita' ? basePath : `${basePath}?category=${encodeURIComponent(cat)}`;
}
---

<nav class="flex gap-2 mb-6 overflow-x-auto pb-2" style="font-family: var(--font-heading);">
  {categories.map((cat) => {
    const isActive = active === cat;
    return (
      <a
        href={getHref(cat)}
        class={`px-4 py-2 text-sm whitespace-nowrap transition-all duration-300 ${
          isActive ? 'nav-active' : 'nav-inactive'
        }`}
        style={isActive
          ? 'background-color: var(--nav-active-bg); color: var(--nav-active-text);'
          : 'background-color: var(--nav-inactive-bg); color: var(--nav-inactive-text);'
        }
      >
        {getLabel(cat)}
      </a>
    );
  })}
</nav>

<style>
  .nav-active {
    border-radius: var(--card-radius);
    font-weight: 600;
  }
  .nav-inactive {
    border-radius: var(--card-radius);
    opacity: 0.8;
  }
  .nav-inactive:hover {
    opacity: 1;
    filter: brightness(1.1);
  }
  /* Theme-specific nav shapes */
  [data-theme="lolita"] .nav-active,
  [data-theme="lolita"] .nav-inactive {
    border-radius: 20px 20px 0 0;
  }
  [data-theme="seiso"] .nav-active,
  [data-theme="seiso"] .nav-inactive {
    border-radius: 9999px;
  }
  [data-theme="jirai"] .nav-active {
    box-shadow: 0 0 8px var(--primary);
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CategoryNav.astro
git commit -m "feat: redesign CategoryNav with themed styled tabs"
```

---

## Task 5: 改造 PhotoGrid 为主题化卡片

**Files:**
- Modify: `src/components/PhotoGrid.astro`

- [ ] **Step 1: 修改 PhotoGrid，添加主题化卡片样式和装饰**

```astro
---
import PhotoSwipeInit from './PhotoSwipeInit.astro';

interface Photo {
  src: string;
  thumb: string;
  w: number;
  h: number;
  alt?: string;
  date?: string;
  category?: string;
  key?: string;
  tags?: string[];
  theme?: string;
}
interface Props {
  photos: Photo[];
  isAuthenticated?: boolean;
}
const { photos, isAuthenticated = false } = Astro.props;
---

{photos.length === 0 ? (
  <p class="text-center py-20" style="color: var(--text-muted);">暂无照片</p>
) : (
  <div class="masonry" id="gallery">
    {photos.map((photo, i) => {
      const rotation = ((i * 7) % 5 - 2); // -2 to +2 degrees
      return (
        <div
          class="masonry-item group relative block mb-4 overflow-hidden"
          style={`background-color: var(--card-bg); border-radius: var(--card-radius); box-shadow: var(--card-shadow); ${photo.theme === 'lolita' ? `transform: rotate(${rotation}deg);` : ''}`}
        >
          <a
            href={photo.src}
            data-pswp-width={photo.w}
            data-pswp-height={photo.h}
            data-caption={`${photo.category || ''}${photo.category && photo.date ? ' · ' : ''}${photo.date || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            class="block"
          >
            <img
              src={photo.thumb}
              alt={photo.alt || `照片 ${i + 1}`}
              loading="lazy"
              width={photo.w}
              height={photo.h}
              class="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02] opacity-0"
              onload="this.classList.remove('opacity-0'); this.classList.add('opacity-100')"
              style="border-radius: calc(var(--card-radius) - 2px);"
            />
          </a>
          {photo.key && (
            <button
              type="button"
              data-key={photo.key}
              class="delete-btn absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 text-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:bg-red-600 hover:text-white"
              title="删除"
            >
              ×
            </button>
          )}
          {/* Lolita date watermark */}
          {photo.date && photo.theme === 'lolita' && (
            <div class="text-center py-2" style="font-family: var(--font-heading); color: var(--primary); font-size: 11px;">
              ✦ {photo.date} ✦
            </div>
          )}
          {/* JK tag */}
          {photo.theme === 'jk' && (
            <div class="flex justify-between items-center px-3 py-2">
              <span style="font-size: 10px; color: var(--primary); background: var(--bg); padding: 2px 8px; border-radius: 10px;">🌸 {photo.category}</span>
              {photo.date && <span style="font-size: 10px; color: var(--text-muted);">{photo.date}</span>}
            </div>
          )}
          {/* Tags display - all themes */}
          {photo.tags && photo.tags.length > 0 && (
            <div class="flex flex-wrap gap-1 px-3 pb-3 pt-1">
              {photo.tags.map((tag: string) => (
                <span
                  class="text-[10px] px-2 py-0.5"
                  style="background-color: var(--nav-inactive-bg); color: var(--nav-inactive-text); border-radius: calc(var(--card-radius) / 2);"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {/* Default overlay for jirai/seiso hover */}
          {(photo.theme === 'jirai' || photo.theme === 'seiso') && (
            <div class="absolute inset-x-0 bottom-0 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" style="background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);">
              {photo.date && <p class="text-xs text-white/90">{photo.date}</p>}
              {photo.category && <p class="text-[10px] text-white/60">{photo.category}</p>}
            </div>
          )}
        </div>
      );
    })}
  </div>
)}

<PhotoSwipeInit />

<script>
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const key = (e.currentTarget as HTMLButtonElement).dataset.key;
      if (!key) return;
      if (!confirm('确定删除这张图片？')) return;
      try {
        const res = await fetch(`/api/upload?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          window.location.reload();
        } else {
          alert('删除失败: ' + (data.error || '未知错误'));
        }
      } catch (err) {
        alert('删除失败: ' + String(err));
      }
    });
  });
</script>

<style>
  .masonry {
    columns: 2;
    column-gap: 1rem;
  }
  .masonry-item {
    break-inside: avoid;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .masonry-item:hover {
    box-shadow: var(--card-shadow), 0 8px 24px rgba(0, 0, 0, 0.1);
  }
  /* Jirai theme card border glow */
  /* Jirai theme card border glow */
  [data-theme="jirai"] .masonry-item {
    border: 1px solid var(--card-border);
  }
  /* Jirai theme delete button higher contrast */
  [data-theme="jirai"] .delete-btn {
    background-color: rgba(255, 105, 180, 0.4);
  }
  @media (min-width: 768px) {
    .masonry { columns: 3; }
  }
  @media (min-width: 1024px) {
    .masonry { columns: 4; }
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PhotoGrid.astro
git commit -m "feat: redesign PhotoGrid with themed cards and tag display"
```

---

## Task 6: 创建 TagFilter 标签筛选组件

**Files:**
- Create: `src/components/TagFilter.astro`

- [ ] **Step 1: 创建 TagFilter 组件**

```astro
---
interface Props {
  tags: string[];
  activeTag: string | null;
  basePath: string;
  category: string;
}
const { tags, activeTag, basePath, category } = Astro.props;

const tagHref = (tag: string | null) => {
  const params = new URLSearchParams();
  if (category && category !== 'lolita') params.set('category', category);
  if (tag) params.set('tag', tag);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
};
---

{tags.length > 0 && (
  <div class="flex gap-2 mb-6 overflow-x-auto pb-2 items-center">
    <a
      href={tagHref(null)}
      class={`px-3 py-1 text-xs whitespace-nowrap transition-all duration-300 ${
        !activeTag ? 'font-semibold' : ''
      }`}
      style={!activeTag
        ? 'background-color: var(--nav-active-bg); color: var(--nav-active-text); border-radius: var(--card-radius);'
        : 'background-color: transparent; color: var(--text-muted); border: 1px solid var(--card-border); border-radius: var(--card-radius);'
      }
    >
      全部
    </a>
    {tags.map((tag) => {
      const isActive = activeTag === tag;
      return (
        <a
          href={tagHref(tag)}
          class={`px-3 py-1 text-xs whitespace-nowrap transition-all duration-300 ${
            isActive ? 'font-semibold' : ''
          }`}
          style={isActive
            ? 'background-color: var(--nav-active-bg); color: var(--nav-active-text); border-radius: var(--card-radius);'
            : 'background-color: transparent; color: var(--text); border: 1px solid var(--card-border); border-radius: var(--card-radius);'
          }
        >
          {tag}
        </a>
      );
    })}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/TagFilter.astro
git commit -m "feat: add TagFilter component for tag-based photo filtering"
```

---

## Task 7: 改造 GalleryPage 添加主题映射和标签系统

**Files:**
- Modify: `src/components/GalleryPage.astro`

- [ ] **Step 1: 修改 GalleryPage，添加分类到主题的映射、标签聚合与筛选，默认 Lolita**

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
const category = Astro.url.searchParams.get('category') || 'lolita';
const activeTag = Astro.url.searchParams.get('tag');
const authEmail = Astro.request.headers.get('cf-access-authenticated-user-email')
  || Astro.request.headers.get('CF-Access-Authenticated-User-Email');
const isAuthenticated = !!authEmail;

// Category to theme mapping
const categoryToTheme: Record<string, string> = {
  lolita: 'lolita',
  jk: 'jk',
  jirai: 'jirai',
  seiso: 'seiso',
  // Support Chinese names from directory structure
  '地雷系': 'jirai',
  '清楚系': 'seiso',
};
const theme = categoryToTheme[category] || 'lolita';

let photos: any[] = [];
let categories: string[] = [];
let error: string | null = null;

try {
  const bucket = env.GALARY_BUCKET;
  if (bucket) {
    const allListed = await bucket.list({ prefix });
    const allObjects = allListed.objects || [];

    const catSet = new Set<string>();
    allObjects.forEach((obj) => {
      const relativeKey = obj.key.slice(prefix.length);
      const firstSlash = relativeKey.indexOf('/');
      if (firstSlash > 0) {
        catSet.add(relativeKey.slice(0, firstSlash));
      }
    });
    categories = Array.from(catSet).sort();

    const targetPrefix = category === 'all' ? prefix : `${prefix}${category}/`;
    const listed = await bucket.list({ prefix: targetPrefix });
    photos = (listed.objects || []).map((obj) => {
      const publicUrl = `https://cdn.tsukino.dev/${obj.key}`;
      const relativeKey = obj.key.slice(prefix.length);
      const parts = relativeKey.split('/');
      const cat = parts.length > 1 ? parts[0] : '';
      const uploaded = obj.uploaded ? new Date(obj.uploaded) : null;
      return {
        src: publicUrl,
        thumb: `/api/image?key=${encodeURIComponent(obj.key)}&width=400`,
        w: parseInt(obj.customMetadata?.width || '2000', 10),
        h: parseInt(obj.customMetadata?.height || '3000', 10),
        key: obj.key,
        category: cat,
        theme: categoryToTheme[cat] || 'lolita',
        tags: obj.customMetadata?.tags ? String(obj.customMetadata.tags).split(',').map((t: string) => t.trim()).filter(Boolean) : [],
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

// Filter photos by active tag
const filteredPhotos = activeTag
  ? photos.filter((p) => p.tags.includes(activeTag))
  : photos;

// Aggregate all tags in current category
const allTagsSet = new Set<string>();
photos.forEach((p) => {
  p.tags.forEach((t: string) => allTagsSet.add(t));
});
const allTags = Array.from(allTagsSet).sort();

const displayHeading = category === 'lolita' ? 'Lolita 写真' : heading;
---

<Layout title={title} theme={theme}>
  <h1 class="text-3xl font-light mb-4" style="font-family: var(--font-heading); color: var(--text);">{displayHeading}</h1>
  <CategoryNav categories={categories} active={category} basePath={Astro.url.pathname} />
  <TagFilter tags={allTags} activeTag={activeTag} basePath={Astro.url.pathname} category={category} />
  {error && <p class="text-center py-8" style="color: #ef4444;">{error}</p>}

  <PhotoGrid photos={filteredPhotos} isAuthenticated={isAuthenticated} />
</Layout>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GalleryPage.astro src/components/TagFilter.astro
git commit -m "feat: add theme mapping, tag aggregation and filtering"
```

---

## Task 8: 为 UploadManager 添加标签输入支持

**Files:**
- Modify: `src/components/UploadManager.jsx`

- [ ] **Step 1: 在 UploadManager 中添加标签输入字段，上传时写入 customMetadata**

在 UploadManager 的表单区域添加标签输入：

```jsx
// 在文件选择区域附近添加标签输入
<div className="mb-4">
  <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>标签（逗号分隔）</label>
  <input
    type="text"
    value={tags}
    onChange={(e) => setTags(e.target.value)}
    placeholder="例如：甜系,室内,粉白,bbd"
    className="w-full px-3 py-2 rounded border"
    style={{ 
      backgroundColor: 'var(--card-bg)', 
      borderColor: 'var(--card-border)', 
      color: 'var(--text)' 
    }}
  />
</div>
```

在 React state 中添加：
```jsx
const [tags, setTags] = useState('');
```

在上传的 `customMetadata` 中添加 tags：
```js
metadata: {
  width: String(file.width || 2000),
  height: String(file.height || 3000),
  tags: tags.trim(),
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UploadManager.jsx
git commit -m "feat: add tags input to UploadManager"
```

---

## Task 9: 修改首页默认指向 Lolita

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 修改 index.astro，默认加载 Lolita**

```astro
---
import GalleryPage from '../components/GalleryPage.astro';
---

<GalleryPage title="Lolita 写真" heading="Lolita 写真" prefix="private/" />
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: set homepage default to Lolita theme"
```

---

## Self-Review

### Spec Coverage Check

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 四套主题 CSS 变量 | Task 1 |
| Tailwind @theme 扩展 | Task 2 |
| data-theme 属性切换 | Task 3 |
| Google Fonts 加载 | Task 3 |
| 背景纹理层 | Task 1 (CSS) + Task 3 (HTML) |
| 风格化导航标签 | Task 4 |
| 主题化照片卡片 | Task 5 |
| 分类→主题映射 | Task 7 |
| 标签聚合与筛选 | Task 6 + Task 7 |
| 标签展示 (TagFilter + 卡片 pills) | Task 5 (合并) |
| 上传标签支持 | Task 8 |
| 默认 Lolita 首页 | Task 7 + Task 9 |
| Lolita 拍立得边框+日期 | Task 5 |
| 地雷系霓虹发光 | Task 1 (shadow) + Task 5 (border) |
| 清楚系大圆角极简 | Task 1 |
| JK 胶片感+小标签 | Task 5 |

### Placeholder Scan
- 无 TBD/TODO
- 所有步骤包含完整代码
- 所有文件路径精确

### Type Consistency
- `data-theme` 值在所有文件中一致：lolita, jk, jirai, seiso
- CSS 变量名在所有文件中一致
- 分类映射键名正确

---

## Testing

验证清单（手动测试）：

1. **构建测试**：`npm run build` 无错误
2. **首页默认**：访问 `/` 应显示 Lolita 主题（奶茶色背景 + 衬线字体）
3. **分类切换**：
   - 点击 JK → 页面变为蓝白系 + 圆体
   - 点击 地雷系 → 页面变为黑粉系 + 霓虹发光
   - 点击 清楚系 → 页面变为白粉系 + 大圆角
4. **卡片装饰**：
   - Lolita 卡片有底部日期水印和轻微旋转
   - 地雷系卡片有粉色边框发光
   - JK 卡片有小标签
   - 清楚系卡片纯白大圆角
5. **背景纹理**：肉眼可见很淡的纹理（3%-5% 透明度）
6. **删除功能**：保留现有删除按钮和确认逻辑
7. **PhotoSwipe**：灯箱功能正常
8. **标签系统**：
   - 标签筛选栏展示当前分类所有标签
   - 点击标签筛选照片，URL 参数更新
   - 照片卡片底部展示标签 pills
   - 「全部」按钮清除筛选
9. **上传标签**：上传表单支持输入逗号分隔的标签，写入 R2 customMetadata
10. **移动端**：全局导航、分类导航和标签筛选栏可横向滚动，瀑布流为 2 列
