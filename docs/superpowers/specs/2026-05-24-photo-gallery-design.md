# 写真照片展示墙设计方案

**日期**: 2026-05-24  
**项目**: galary — 个人写真照片展示墙  
**部署目标**: Cloudflare Pages + R2  

---

## 1. 项目概述

一个纯前端、无服务器的个人写真照片展示系统，部署在 Cloudflare Pages 上，照片存储在 Cloudflare R2（免费 10GB），通过浏览器端 Canvas 打水印后上传，使用 Astro 生成静态展示页面，PhotoSwipe 实现大图灯箱浏览。

### 核心需求
- 上传自己的写真照片，自动打水印（水印样式和内容可配置）
- 照片墙展示，支持点击放大浏览
- 部分内容为隐藏内容，需密码或 OAuth 登录后才能查看
- 无服务器部署（Cloudflare Pages）
- 存储在 Cloudflare R2（免费额度）
- 照片规模：约几百张，单张约 20MB（原图）

---

## 2. 技术选型

| 层级 | 技术 | 版本/说明 | 选择理由 |
|------|------|-----------|----------|
| 静态站点框架 | Astro | v5.x | 零 JS 默认，构建极快，适合内容型站点 |
| 图片灯箱 | PhotoSwipe | v5.x | 25175⭐，手势缩放/滑动，移动端完美适配 |
| 水印处理 | watermark-js-plus | v2.x | 546⭐，浏览器 Canvas，文字/盲水印，Vue/React 兼容 |
| 图片压缩 | browser-image-compression | v2.x | 浏览器端压缩，减小上传体积 |
| 存储 | Cloudflare R2 | — | 10GB 免费，出站流量免费，S3 兼容 API |
| 上传接口 | Cloudflare Worker | — | 验证文件类型/大小后写入 R2，不暴露密钥 |
| 缩略图优化 | Cloudflare Images | URL 变换 | 动态裁剪/格式转换，不消耗 R2 流量 |
| 部署 | Cloudflare Pages | — | 绑定 git 自动构建部署 |
| 认证 | Cloudflare Access / Workers JWT | — | 隐藏内容访问控制 |
| 样式 | Tailwind CSS | v4.x | 原子化 CSS，快速构建响应式布局 |

---

## 3. 架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Pages                              │
│  ┌──────────────┐  ┌──────────────┐                                 │
│  │   /          │  │  /upload     │                                 │
│  │  展示墙       │  │  上传页面     │                                 │
│  │  Astro SSG   │  │  Astro + JS  │                                 │
│  │  PhotoSwipe  │  │  watermark   │                                 │
│  └──────────────┘  └──────────────┘                                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ fetch POST /api/upload
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Worker                             │
│  • 验证文件类型 (jpeg/png/webp)                                       │
│  • 验证文件大小 (<20MB)                                              │
│  • 生成唯一文件名 (timestamp-uuid.ext)                                │
│  • 写入 Cloudflare R2                                                │
│  • 返回公开访问 URL                                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Cloudflare R2                                 │
│  Bucket: galary-photos                                               │
│  ├── photos/                                                         │
│  │   ├── 20250524-xxx-1.jpg  (带水印原图)                             │
│  │   ├── 20250524-xxx-2.jpg                                         │
│  │   └── ...                                                         │
│  └── thumbs/                                                         │
│      ├── 20250524-xxx-1.jpg  (缩略图，可选)                           │
│      └── ...                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 页面设计

### 4.1 展示墙页面 (`/`)

**布局**: 响应式瀑布流网格（Masonry）或等行高网格（Rows）
**结构**:
- Header: 站点标题 + 简介
- Gallery Grid: 照片缩略图网格
  - 缩略图使用 Cloudflare Images URL 变换（width=400, quality=80, format=webp）
  - 点击打开 PhotoSwipe 灯箱
  - 灯箱显示带水印原图（直接从 R2 读取）
- Footer: 版权信息

**PhotoSwipe 配置**:
- 手势: 双指缩放、左右滑动切换
- 显示: 图片标题/EXIF 信息（可选）
- 键盘: ESC 关闭、方向键切换

### 4.2 上传页面 (`/upload`)

**布局**: 单页应用，拖拽上传区域
**结构**:
- 拖拽区域: 拖入图片或点击选择
- 水印配置面板（所有参数可实时调整并保存到 localStorage）:
  - 文字内容（默认"© YourName"）
  - 字体大小、颜色、透明度（0-100%）
  - 旋转角度（0-360°）
  - 平铺模式：全图平铺 / 右下角单点 / 居中
  - 平铺间距 X/Y（px）
  - 实时预览（小图预览效果）
  - 保存配置 / 恢复默认
  - 支持上传图片水印（Logo 等）
- 图片处理流程:
  1. 读取原图 → FileReader
  2. 检查图片尺寸（如果 >10MB 提示建议压缩）
  3. 用 watermark-js-plus 在 Canvas 上绘制水印（使用用户配置的样式）
  4. 用 browser-image-compression 压缩（质量 0.9，保持视觉无损）
  5. 生成缩略图（用 Canvas 缩放至 max 1200px 长边，作为展示用原图）
  6. 上传处理后的图片到 Worker
  > 注：单张 20MB 原图浏览器 Canvas 处理可能卡顿，建议上传时压缩至 5-8MB
- 上传进度条 + 结果反馈

---

## 5. 数据流

### 5.1 上传流程

```
用户选择图片
    │
    ▼
[浏览器] FileReader 读取为 Image
    │
    ▼
[浏览器] watermark-js-plus 在 Canvas 绘制水印
    │
    ▼
[浏览器] browser-image-compression 压缩（可选，quality 0.9）
    │
    ▼
[浏览器] Canvas.toBlob() 生成 JPEG Blob
    │
    ▼
[浏览器] fetch POST /api/upload → Cloudflare Worker
    │
    ▼
[Worker] 验证: Content-Type (image/*), Size (<20MB)
    │
    ▼
[Worker] 生成文件名: photos/{timestamp}-{uuid}.jpg
    │
    ▼
[Worker] R2.put(key, blob) 写入存储桶
    │
    ▼
[Worker] 返回 JSON: {success, url, key}
    │
    ▼
[浏览器] 显示上传成功 + 预览图
```

### 5.2 展示流程

```
用户访问 /
    │
    ▼
[Astro 构建时] 读取 R2 图片列表（或静态 JSON 配置）
    │
    ▼
[Astro 构建时] 生成静态 HTML，嵌入缩略图 URL
    │        （缩略图使用 Cloudflare Images 变换）
    ▼
[浏览器] 加载静态页面，显示缩略图网格
    │
    ▼
[用户] 点击缩略图
    │
    ▼
[PhotoSwipe] 弹出灯箱，加载 R2 原图 URL
    │
    ▼
[浏览器] 全屏浏览带水印原图，支持手势操作
```

---

## 6. 认证与访问控制

### 6.1 需求
- 公开内容：所有人可见（如精选展示）
- 隐藏内容：需认证后才能查看完整写真集
- 支持密码登录 或 OAuth（Google/GitHub）

### 6.2 方案对比

| 方案 | 实现方式 | 安全性 | 复杂度 | 成本 |
|------|---------|--------|--------|------|
| **A. Cloudflare Access** | Zero Trust 策略，保护整个站点或子路径 | ⭐⭐⭐⭐⭐ | 中 | 免费（最多 50 用户） |
| **B. Workers JWT 验证** | Worker 签发/验证 JWT Cookie，前端带 Token 请求 | ⭐⭐⭐⭐ | 高 | 免费 |
| **C. 前端密码哈希** | 纯前端 SHA256 比对密码，通过后显示内容 | ⭐⭐ | 低 | 免费 |

### 6.3 推荐方案：Cloudflare Access（方案 A）

原因：
- 官方原生支持，无需写代码
- 支持 Google/GitHub/One-time PIN 等多种 OAuth
- 支持保护特定路径（如 `/private/*`）
- 免费版支持最多 50 个用户

**配置方式**：
1. Cloudflare 控制台 → Zero Trust → Access → Applications
2. 添加 Self-hosted 应用
3. 配置策略：允许邮件域名 或 特定邮箱
4. 选择保护路径：`your-domain.com/private/*`

**Astro 页面结构**：
```
src/pages/
├── index.astro          # 公开首页（精选/预览）
├── private/
│   └── index.astro      # 完整写真集（受 Access 保护）
└── upload.astro         # 上传页面（受 Access 保护，仅自己可访问）
```

### 6.4 备选方案：前端密码保护（方案 C）

如果只需要简单密码，不想配置 Access：
- 上传页：用环境变量或硬编码 SHA256 哈希比对
- 展示页：同样方式保护 `/private` 路径
- ⚠️ 此方案只能防君子，懂技术的用户可通过查看源码绕过

---

## 7. 水印方案

### 6.1 实现方式

采用**浏览器端 Canvas 水印**（方案一），原因：
- Cloudflare Images URL 变换**不支持**叠加水印参数
- Cloudflare Workers 实时合成水印 CPU 限制（10ms/50ms），4K 写真易超时
- 浏览器端处理零成本，效果完全可控

### 6.2 水印样式

默认配置：
```javascript
{
  content: '© YourName',
  width: 300,
  height: 200,
  rotate: 45,
  fontSize: '24px',
  fontColor: 'rgba(255, 255, 255, 0.4)',
  fontFamily: 'Arial',
  gap: [100, 100],
  mode: 'repeat',      // 平铺模式
  position: 'center',
}
```

### 6.3 水印位置策略

写真照片建议**全图平铺**，原因：
- 单点水印容易被裁剪去除
- 平铺水印覆盖面积大，防盗效果更好
- 透明度 40% 左右，不影响观感

---

## 8. 大文件处理策略（20MB 原图）

### 7.1 问题分析

单张 20MB 写真照片的特点：
- 尺寸大（通常为 6000×4000px 左右，未压缩 RAW 转 JPEG）
- 浏览器 Canvas 处理 20MB 图片时，内存峰值可能达到 100-200MB
- 上传时间长（国内网络上传 20MB 约 10-30 秒）
- 展示时加载 20MB 原图极慢，用户体验差

### 7.2 处理策略

**策略一：上传时压缩（推荐）**
- 浏览器端用 `browser-image-compression` 压缩至 5-8MB
- 质量参数 0.9，长边限制 3000px
- 压缩后视觉几乎无损，上传速度提升 3-4 倍
- Canvas 打水印在压缩后的图片上进行，内存占用大幅降低

**策略二：仅上传压缩版，不保留 20MB 原图**
- 如果 20MB 是相机直出且不需要保留原图
- 直接压缩后上传，节省 R2 空间

**策略三：分级存储（如果需要保留原图）**
- 20MB 原图 → 本地 NAS/硬盘备份（不存 R2）
- 压缩版（5-8MB）→ 上传 R2 用于展示
- 这样 300 张照片约占用 300 × 6MB = 1.8GB，远低于 R2 免费 10GB

### 7.3 照片规模估算

| 项目 | 数量 | 单张大小 | 总量 |
|------|------|----------|------|
| 原图（本地备份） | 300 张 | 20MB | 6GB（本地） |
| 压缩版（R2 展示） | 300 张 | 6MB | 1.8GB（R2） |
| 缩略图（Images 生成） | 300 张 | 0.1MB | 0（不额外存储） |
| **R2 总占用** | — | — | **≈2GB** |

**结论**：300 张 × 6MB = 1.8GB，在 R2 免费 10GB 额度内，空间充足。

---

## 9. R2 存储设计

### 7.1 Bucket 结构

```
galary-photos (Bucket)
├── photos/                          # 带水印原图
│   ├── 20250524-xxx-1.jpg
│   └── ...
└── thumbs/                          # 缩略图（可选，也可用 Images 动态生成）
    ├── 20250524-xxx-1.jpg
    └── ...
```

### 7.2 访问控制

- R2 Bucket 设为**公开可读**（Public Bucket），使图片 URL 可直接访问
- 上传通过 Worker 进行，Worker 绑定 R2 写入权限
- 不暴露 R2 Access Key 到前端

### 7.3 文件名生成

格式: `{timestamp}-{uuid4}.{ext}`
示例: `20250524-171645-a1b2c3d4.jpg`

---

## 10. Worker 上传接口设计

### 8.1 接口定义

```
POST /api/upload
Content-Type: multipart/form-data

Body:
  file: Blob (image/jpeg, image/png, image/webp)

Response (200):
{
  "success": true,
  "url": "https://pub-xxx.r2.dev/photos/20250524-xxx.jpg",
  "key": "photos/20250524-xxx.jpg",
  "size": 2048576
}

Response (400/413/415):
{
  "success": false,
  "error": "File too large (max 20MB)"
}
```

### 8.2 Worker 代码结构

```javascript
export default {
  async fetch(request, env, ctx) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }
    
    // 只接受 POST
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405)
    }
    
    // 解析 formData
    const formData = await request.formData()
    const file = formData.get('file')
    
    // 验证
    if (!file || !file.type.startsWith('image/')) {
      return jsonResponse({ success: false, error: 'Invalid file type' }, 415)
    }
    if (file.size > 20 * 1024 * 1024) {
      return jsonResponse({ success: false, error: 'File too large (max 20MB)' }, 413)
    }
    
    // 生成文件名
    const ext = file.name.split('.').pop().toLowerCase()
    const key = `photos/${Date.now()}-${crypto.randomUUID()}.${ext}`
    
    // 写入 R2
    await env.GALARY_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    })
    
    // 返回公开 URL
    const url = `https://${env.R2_PUBLIC_URL}/${key}`
    return jsonResponse({ success: true, url, key, size: file.size })
  }
}
```

### 8.3 CORS 配置

Worker 需要配置 CORS，允许 Cloudflare Pages 域名访问：
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://your-gallery.pages.dev',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

---

## 11. 缩略图策略

### 9.1 方案选择

采用 **Cloudflare Images URL 变换** 生成缩略图，不预生成缩略图存储到 R2。

原因：
- 不需要额外存储空间
- 动态按需生成
- 自动适配设备（webp/avif）
- Cloudflare Images 免费额度足够个人使用

### 9.2 缩略图 URL 格式

原图 URL: `https://pub-xxx.r2.dev/photos/20250524-xxx.jpg`

缩略图 URL（通过 Cloudflare Images 变换）:
```
https://your-domain.com/cdn-cgi/image/width=400,quality=80,format=webp/https://pub-xxx.r2.dev/photos/20250524-xxx.jpg
```

或者在自定义域名下：
```
https://your-domain.com/cdn-cgi/image/fit=scale-down,width=800,quality=85/https://pub-xxx.r2.dev/photos/20250524-xxx.jpg
```

> 注意：使用 Cloudflare Images 变换需要在 Cloudflare 控制台启用 Images > Transformations，并确保域名已接入 Cloudflare。

---

## 12. 安全考虑

| 风险 | 缓解措施 |
|------|----------|
| 恶意大文件上传 | Worker 验证文件大小 (<20MB)，文件类型 (image/*) |
| 非图片文件上传 | Worker 检查 MIME type，R2 写入时设置 contentType |
| R2 密钥泄露 | Worker 中转上传，前端不接触 R2 Access Key |
| 图片被直接下载 | 水印已嵌入图片本身，无法去除 |
| 上传接口被滥用 | Worker 可添加简单速率限制（如 IP 限流） |
| CORS 跨域 | Worker 严格配置允许的 Origin |

---

## 13. 部署流程

### 11.1 开发环境

```bash
# 初始化项目
npm create astro@latest galary -- --template minimal
cd galary
npm install photoswipe watermark-js-plus browser-image-compression
npm install -D @types/photoswipe wrangler

# 本地开发
npm run dev

# Worker 本地测试
npx wrangler dev worker/index.js
```

### 11.2 生产部署

1. **Cloudflare R2**: 创建 Bucket `galary-photos`，设为 Public
2. **Cloudflare Worker**: 部署上传 Worker，绑定 R2 Bucket
3. **Cloudflare Pages**: 连接 GitHub 仓库，配置构建命令 `npm run build`，输出目录 `dist`
4. **自定义域名**（可选）: 绑定自己的域名，开启 Images Transformations

### 11.3 Git 工作流

```bash
# 开发
 git checkout -b feature/upload-page
# ... coding ...
 git commit -m "feat: add upload page"
 git push origin feature/upload-page

# Cloudflare Pages 自动构建部署
```

---

## 14. 文件结构

```
galary/
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-05-24-photo-gallery-design.md  ← 本文件
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── PhotoGrid.astro          # 照片网格组件
│   │   ├── PhotoSwipeInit.astro     # PhotoSwipe 初始化脚本
│   │   ├── WatermarkUploader.jsx    # 上传页面组件（React/Vue）
│   │   ├── WatermarkConfig.jsx      # 水印配置面板
│   │   └── ImageCompressor.js       # 浏览器压缩工具
│   ├── layouts/
│   │   └── Layout.astro             # 基础布局
│   ├── pages/
│   │   ├── index.astro              # 公开展示墙（精选预览）
│   │   ├── private/
│   │   │   └── index.astro          # 完整写真集（受 Access 保护）
│   │   └── upload.astro             # 上传页面（受 Access 保护）
│   └── styles/
│       └── global.css
├── worker/
│   └── index.js                     # Cloudflare Worker 上传接口
├── astro.config.mjs                 # Astro 配置
├── wrangler.toml                    # Worker 部署配置
├── package.json
└── README.md
```

---

## 15. 后续扩展（可选）

- [ ] 图片分类/标签
- [ ] 按时间线分组
- [ ] EXIF 信息读取展示
- [ ] 暗黑模式
- [ ] 懒加载 + 无限滚动
- [ ] 多用户/密码保护
- [ ] 批量上传
- [ ] 图片排序/拖拽

---

*设计完成，等待实现。*
