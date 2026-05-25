# 画廊展示优化 + 相册分类设计

## 目标
保留 PhotoSwipe，升级前端展示效果，并支持相册分类浏览。

## 展示优化

### 1. Masonry 瀑布流布局
- 使用纯 CSS `columns` 实现，无需 JS 库
- 响应式：手机 2 列 → 平板 3 列 → 桌面 4 列
- 图片按原始宽高比展示，不等高排列

### 2. 图片懒加载 + 淡入动画
- `loading="lazy"` 原生懒加载
- 加载完成后 CSS `opacity` 从 0 → 1 过渡
- 骨架屏占位（灰色背景）

### 3. 悬停信息层
- 底部渐变遮罩（透明 → 黑色 60%）
- 显示：拍摄日期、分类标签
- 轻微放大动效 `scale(1.03)`

## 分类系统

### R2 Key 结构
```
{visibility}/{category}/{timestamp}-{uuid}.jpg
```
示例：
- `public/landscape/1752451200000-a1b2.jpg`
- `public/portrait/1752451200000-c3d4.jpg`
- `private/2025-05/1752451200000-e5f6.jpg`

### 上传流程改动
- 上传表单增加「分类」输入框（可选，默认"default"）
- 后端 `src/api/upload.ts` 读取分类参数，拼入 key

### 前端交互
- **顶部标签栏**：自动解析所有图片的 key，提取分类列表
  - 标签：全部 | 风景 | 人像 | ...
  - 点击切换，`GalleryPage` 按对应 prefix 重新 list
- **时间线分组**：在「全部」视图下，按 `uploaded` 年月分组
  - 每组可折叠
  - 如：2025-05 (12张) ▼

## 组件设计

| 组件 | 职责 |
|---|---|
| `GalleryPage.astro` | 页面容器，接收 `prefix`，协调数据获取和子组件 |
| `PhotoGrid.astro` | Masonry 网格渲染，处理悬停效果和懒加载 |
| `CategoryNav.astro` | 顶部分类标签栏，解析分类列表，切换 prefix |
| `TimelineGroup.astro` | 时间线分组（仅在「全部」视图下使用） |
| `PhotoSwipeInit.astro` | 保留，初始化 PhotoSwipe 灯箱 |

## 数据流

```
用户点击分类标签
  → CategoryNav 更新 URL query / 或切换页面
  → GalleryPage 用新 prefix 调用 bucket.list()
  → PhotoGrid 接收 photos 数组，渲染 Masonry
  → PhotoSwipeInit 重新绑定灯箱事件
```

## 约束
- 不引入新灯箱库（保留 PhotoSwipe）
- 不引入 Masonry JS 库（纯 CSS columns）
- R2 list 默认返回 1000 条，暂不做分页（当前量级足够）
