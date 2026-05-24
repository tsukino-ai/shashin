# 写真照片展示墙设计方案

**日期**: 2026-05-24  
**项目**: galary — 个人写真照片展示墙  
**部署目标**: Cloudflare Pages + R2  

---

## 1. 项目概述

一个纯前端、无服务器的个人写真照片展示系统，部署在 Cloudflare Pages 上，照片存储在 Cloudflare R2（免费 10GB），通过浏览器端 Canvas 打水印后上传，使用 Astro 生成静态展示页面，PhotoSwipe 实现大图灯箱浏览。

### 核心需求
- 上传自己的写真照片，自动打水印
- 照片墙展示，支持点击放大浏览
- 无服务器部署（Cloudflare Pages）
- 存储在 Cloudflare R2（免费额度）

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
- 水印配置面板:
  - 文字内容（默认"© YourName"）
  - 字体大小、颜色、透明度
  - 旋转角度、平铺间距
  - 实时预览
- 图片处理流程:
  1. 读取原图 → FileReader
  2. 用 watermark-js-plus 在 Canvas 上绘制水印
  3. 用 browser-image-compression 压缩（可选）
  4. 生成缩略图（可选，用 Canvas 缩放）
  5. 上传原图（+缩略图）到 Worker
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

## 6. 水印方案

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

## 7. R2 存储设计

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

## 8. Worker 上传接口设计

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

## 9. 缩略图策略

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

## 10. 安全考虑

| 风险 | 缓解措施 |
|------|----------|
| 恶意大文件上传 | Worker 验证文件大小 (<20MB)，文件类型 (image/*) |
| 非图片文件上传 | Worker 检查 MIME type，R2 写入时设置 contentType |
| R2 密钥泄露 | Worker 中转上传，前端不接触 R2 Access Key |
| 图片被直接下载 | 水印已嵌入图片本身，无法去除 |
| 上传接口被滥用 | Worker 可添加简单速率限制（如 IP 限流） |
| CORS 跨域 | Worker 严格配置允许的 Origin |

---

## 11. 部署流程

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

## 12. 文件结构

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
│   │   └── WatermarkUploader.jsx    # 上传页面组件（React/Vue）
│   ├── layouts/
│   │   └── Layout.astro             # 基础布局
│   ├── pages/
│   │   ├── index.astro              # 展示墙首页
│   │   └── upload.astro             # 上传页面
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

## 13. 后续扩展（可选）

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
