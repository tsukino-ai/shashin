# 日系多风格写真展示界面设计文档

## 背景与目标

将现有的 Astro + Tailwind CSS 写真展示网站（`shashin`）从简洁暗色系界面升级为 **日系多风格主题系统**。写真内容以 Lolita、JK、地雷系、清楚系四种日系风格为主，界面需要能够随写真分类切换而呈现对应的视觉氛围。

## 设计策略：统一骨架 + 主题皮肤

采用「统一骨架 + 主题皮肤」架构：
- 页面骨架（导航位置、瀑布流结构、卡片尺寸比例）在所有分类间保持一致
- 通过 CSS 自定义属性（CSS Variables）和 `data-theme` 属性切换配色、字体、边框样式和背景纹理
- 每种风格保留独特的「记忆点」装饰元素

此方案兼顾风格辨识度与代码可维护性，便于后续扩展新分类。

## 信息架构

### 页面结构

```
Layout.astro (统一骨架)
├── Google Fonts 加载
├── data-theme 属性控制全局主题
├── 背景纹理层 (CSS ::before 伪元素)
├── 顶部导航 (CategoryNav)
│   └── 四个分类标签：Lolita | JK | 地雷系 | 清楚系
│   └── 当前分类高亮，其他弱化
├── 主内容区
│   └── 标签筛选栏 (TagFilter)
│       └── 展示当前分类下所有可用标签，支持点击筛选
│   └── 月度折叠分组（保留现有逻辑）
│   └── PhotoGrid 瀑布流
│       └── 照片卡片（根据主题变体渲染）
│           └── 图片 + 标签展示 + 可选日期标签 + hover 效果
├── PhotoSwipe 灯箱（保留现有功能）
└── 删除按钮（保留现有功能）
```

### 路由调整

- 移除首页「精选」入口，根路由 `/` 默认展示 Lolita 分类内容
- 其他分类通过顶部导航切换（URL 参数 `?category=jk` 等）
- 标签筛选通过 URL 参数 `?tag=xxx` 或 `?tags=xxx,yyy` 实现
- `/private/` 路由保持，同样应用主题系统
- `/upload` 和 `/manage` 不参与主题切换，保持简洁实用风格

## 主题系统

### 四套主题配色变量

#### Lolita 主题 (`data-theme="lolita"`)

| 变量 | 值 | 说明 |
|------|-----|------|
| `--bg` | `#f5e6d3` | 奶茶色背景 |
| `--bg-texture` | `rgba(139,69,19,0.04)` | 暗棕斜线纹理 |
| `--text` | `#5c3a1e` | 深棕文字 |
| `--primary` | `#8b4513` | 主色 saddlebrown |
| `--accent` | `#c17817` | 强调色 |
| `--card-bg` | `#fffbf5` | 卡片象牙白 |
| `--card-border` | `#e8d5c0` | 卡片边框 |
| `--card-radius` | `4px` | 小圆角 |
| `--card-shadow` | `0 4px 12px rgba(139,69,19,0.12)` | 暖棕阴影 |
| `--nav-active-bg` | `#8b4513` | 导航激活背景 |
| `--nav-active-text` | `#f5e6d3` | 导航激活文字 |
| `--nav-inactive-bg` | `#e8d5c0` | 导航未激活背景 |
| `--font-heading` | `'Noto Serif JP', serif` | 衬线标题字体 |
| `--font-body` | `'Noto Serif JP', serif` | 衬线正文字体 |

**特征元素**：拍立得白边框卡片、底部日期水印（✦ YYYY.MM.DD ✦）、轻微随机旋转(-2°~2°)、圆弧缎带形导航标签。

#### JK 主题 (`data-theme="jk"`)

| 变量 | 值 | 说明 |
|------|-----|------|
| `--bg` | `#e8f4f8` | 水手蓝白背景 |
| `--bg-texture` | `rgba(44,95,124,0.03)` | 淡蓝圆点纹理 |
| `--text` | `#2c5f7c` | 深蓝文字 |
| `--primary` | `#2c5f7c` | 主色 |
| `--accent` | `#5ba3c0` | 强调色 |
| `--card-bg` | `#ffffff` | 纯白卡片 |
| `--card-border` | `#c0dce8` | 淡蓝边框 |
| `--card-radius` | `8px` | 中等圆角 |
| `--card-shadow` | `0 2px 8px rgba(44,95,124,0.1)` | 淡蓝阴影 |
| `--nav-active-bg` | `#2c5f7c` | 导航激活背景 |
| `--nav-active-text` | `#ffffff` | 导航激活文字 |
| `--nav-inactive-bg` | `#c0dce8` | 导航未激活背景 |
| `--font-heading` | `'Zen Maru Gothic', sans-serif` | 圆体标题 |
| `--font-body` | `'Zen Maru Gothic', sans-serif` | 圆体正文 |

**特征元素**：胶片感边框、校徽/樱花小标签、圆角 8px 卡片、制服领结形导航标签。

#### 地雷系主题 (`data-theme="jirai"`)

| 变量 | 值 | 说明 |
|------|-----|------|
| `--bg` | `#1a0a12` | 深黑背景 |
| `--bg-texture` | `rgba(255,105,180,0.02)` | 粉色噪点纹理 |
| `--text` | `#e8c8d8` | 淡粉文字 |
| `--primary` | `#ff69b4` | 主色 hotpink |
| `--accent` | `#ff1493` | 强调色 deeppink |
| `--card-bg` | `#2d1a22` | 暗紫卡片底 |
| `--card-border` | `#ff69b4` | 霓虹粉边框 |
| `--card-radius` | `0px` | 直角 |
| `--card-shadow` | `0 0 16px rgba(255,105,180,0.2)` | 霓虹发光 |
| `--nav-active-bg` | `#ff69b4` | 导航激活背景 |
| `--nav-active-text` | `#1a0a12` | 导航激活文字 |
| `--nav-inactive-bg` | `#2d1a22` | 导航未激活背景 |
| `--font-heading` | `'Zen Kaku Gothic New', sans-serif` | 锐角无衬线 |
| `--font-body` | `'Zen Kaku Gothic New', sans-serif` | 锐角无衬线 |

**特征元素**：暗色底 + 霓虹粉边框发光、直角锋利感、无日期文字标签、故障像素风导航标签。

#### 清楚系主题 (`data-theme="seiso"`)

| 变量 | 值 | 说明 |
|------|-----|------|
| `--bg` | `#fff5f7` | 淡粉白背景 |
| `--bg-texture` | `rgba(212,165,165,0.03)` | 柔光光斑纹理 |
| `--text` | `#8a7070` | 灰棕文字 |
| `--primary` | `#d4a5a5` | 主色淡粉 |
| `--accent` | `#e8c4c4` | 强调色 |
| `--card-bg` | `#ffffff` | 纯白卡片 |
| `--card-border` | `#f0d5d8` | 极淡粉边框 |
| `--card-radius` | `16px` | 大圆角 |
| `--card-shadow` | `0 2px 12px rgba(212,165,165,0.1)` | 淡粉阴影 |
| `--nav-active-bg` | `#d4a5a5` | 导航激活背景 |
| `--nav-active-text` | `#ffffff` | 导航激活文字 |
| `--nav-inactive-bg` | `#ffffff` | 导航未激活背景 |
| `--font-heading` | `'Zen Kaku Gothic New', sans-serif` | 轻量无衬线 |
| `--font-body` | `'Zen Kaku Gothic New', sans-serif` | 轻量无衬线 |

**特征元素**：纯白极简 + 大圆角 16px、无文字标签、气泡圆形导航标签、大量留白。

### 字体加载策略

通过 Google Fonts 一次性加载所有四种字体（字体文件不大，且用户会切换分类）：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;600&family=Zen+Kaku+Gothic+New:wght@300;400;700&family=Zen+Maru+Gothic:wght@400;700&display=swap" rel="stylesheet">
```

### 背景纹理实现

所有纹理通过 `body::before` 伪元素实现，使用 `position: fixed` 覆盖全屏，`z-index: -1` 置于内容下方：

```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-color: var(--bg);
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  /* 纹理由 data-theme 选择器定义 */
}

[data-theme="lolita"] body::after {
  background-image: repeating-linear-gradient(
    45deg, transparent, transparent 35px,
    var(--primary) 35px, var(--primary) 70px
  );
  opacity: 0.04;
}

[data-theme="jk"] body::after {
  background-image: radial-gradient(
    circle at 30% 30%, var(--primary) 0.5px, transparent 0.5px
  );
  background-size: 40px 40px;
  opacity: 0.03;
}

[data-theme="jirai"] body::after {
  background-image: radial-gradient(
    circle at 20% 50%, var(--primary) 1px, transparent 1px
  ), radial-gradient(
    circle at 80% 80%, var(--primary) 1px, transparent 1px
  );
  background-size: 60px 60px;
  opacity: 0.02;
}

[data-theme="seiso"] body::after {
  background: radial-gradient(
    ellipse at 30% 20%, #ffd0d8 0%, transparent 50%
  ), radial-gradient(
    ellipse at 70% 80%, #d0e8ff 0%, transparent 50%
  );
  opacity: 0.03;
}
```

## 组件设计

### CategoryNav（顶部导航标签）

改造为风格化标签导航：
- 当前激活分类：填充主色背景 + 白色文字 + 该主题特有的标签形状
- 其他分类：半透明/浅色背景 + 主色文字 + 统一形状
- 标签形状随主题变化：Lolita 圆弧缎带顶、JK 圆角矩形、地雷系直角边框、清楚系气泡圆
- 移动端保持横向滚动

### PhotoGrid（照片卡片）

瀑布流布局保留，卡片样式由 CSS 变量驱动：
- 边框圆角：`var(--card-radius)`
- 背景色：`var(--card-bg)`
- 阴影：`var(--card-shadow)`
- 边框：`1px solid var(--card-border)`（地雷系等需要明显边框的主题）
- Lolita 卡片底部增加日期水印（✦ YYYY.MM.DD ✦）
- JK 卡片增加小标签区域（樱花 emoji + 分类名）
- **照片标签展示**：hover 时或卡片底部显示该照片的标签（小 pill 样式）
- hover 效果：轻微放大(scale 1.02) + 阴影加深
- Lolita 卡片可添加轻微随机旋转（-2° ~ 2°），通过 inline style 或 CSS nth-child 实现

### TagFilter（标签筛选栏）

在 CategoryNav 下方、照片网格上方展示：
- 展示当前分类下所有照片的标签集合（去重后排序）
- 标签以 pill/badge 样式横向排列，支持溢出滚动
- 当前选中的标签：填充主色背景 + 白色文字
- 未选中的标签：半透明边框 + 主色文字
- 点击标签切换筛选状态，URL 参数同步更新（`?tag=xxx`）
- 支持「全部」选项，清除所有标签筛选
- 标签展示样式随主题变化：Lolita 衬线体小标签、地雷系霓虹边框等

### Layout（页面骨架）

- `html` 标签上设置 `data-theme` 属性，值为当前分类对应的主题 key
- 默认（无 category 参数或根路由）为 `lolita`
- 引入 Google Fonts link
- body 背景由 CSS 变量控制，移除现有的 `bg-neutral-900`

## 技术实现

### Tailwind CSS v4 配置

在 `global.css` 中通过 `@theme` 扩展定义主题相关的颜色变量：

```css
@import "tailwindcss";

@theme {
  --color-theme-bg: var(--bg);
  --color-theme-text: var(--text);
  --color-theme-primary: var(--primary);
  --color-theme-accent: var(--accent);
  --color-theme-card: var(--card-bg);
  --color-theme-card-border: var(--card-border);
  --font-theme-heading: var(--font-heading);
  --font-theme-body: var(--font-body);
}
```

在组件中使用 `bg-theme-bg`、`text-theme-text` 等类名。

### 主题切换逻辑

在 `GalleryPage.astro` 中：
1. 根据当前 `category` 参数映射到对应的 theme key
2. 将 theme key 传递给 Layout
3. Layout 在 html 标签上设置 `data-theme`

映射关系：
| 分类参数 | 主题 |
|----------|------|
| （默认） | lolita |
| `jk` | jk |
| `jirai` / `地雷系` | jirai |
| `seiso` / `清楚系` | seiso |

**注意**：实际分类名称可能与 theme key 不完全一致，需要建立映射表或约定分类目录命名。

### 标签系统数据流

1. **存储**：标签以逗号分隔的字符串存储在 R2 对象的 `customMetadata.tags` 中
2. **读取**：列表照片时解析 `tags` 字段为字符串数组
3. **聚合**：遍历当前分类下所有照片，提取并去重所有标签，生成标签云
4. **筛选**：根据 URL 的 `tag` 参数过滤照片数组，只展示包含该标签的照片
5. **多标签（未来）**：当前先实现单标签筛选，URL 参数为 `?tag=xxx`，后续可扩展为 `?tags=xxx,yyy`

标签数据示例：
```js
// R2 customMetadata
customMetadata: {
  width: '2000',
  height: '3000',
  tags: '甜系,室内,粉白,bbd'  // 逗号分隔
}

// 解析后
photo.tags = ['甜系', '室内', '粉白', 'bbd'];
```

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/styles/global.css` | 修改 | 添加 `@theme` 扩展和主题 CSS 变量定义 |
| `src/styles/themes.css` | 新增 | 四套主题的完整 CSS 变量和纹理定义 |
| `src/layouts/Layout.astro` | 修改 | 添加 data-theme、Google Fonts、背景纹理层 |
| `src/components/CategoryNav.astro` | 修改 | 重新设计为风格化标签导航 |
| `src/components/PhotoGrid.astro` | 修改 | 卡片样式改为 CSS 变量驱动，添加主题化装饰 |
| `src/components/GalleryPage.astro` | 修改 | 移除精选逻辑，默认指向 Lolita，添加 theme 映射和标签聚合/筛选逻辑 |
| `src/components/TagFilter.astro` | 新增 | 标签筛选栏组件 |
| `src/pages/index.astro` | 修改 | 默认加载 Lolita 内容 |

## 交互与动画

### Hover 效果
- 照片卡片 hover 时：`transform: scale(1.02)` + 阴影加深
- 导航标签 hover 时：背景色过渡变化
- 所有过渡使用 `transition: all 0.3s ease`

### 页面切换
- 分类切换时无复杂动画，保持页面刷新的简洁体验
- 如后续需要，可添加 CSS fade-in 动画

## 边界情况

1. **分类名称不匹配**：如果 R2 bucket 中的分类目录名与 theme key 不完全一致，需要建立映射表
2. **无标签照片**：标签筛选栏仍正常展示，只是该照片不会出现在任何标签筛选结果中
3. **标签中文编码**：URL 参数中的中文标签需要 `encodeURIComponent` / `decodeURIComponent` 处理
4. **字体加载失败**：设置系统字体回退栈：`font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif`
5. **移动端适配**：导航标签和标签筛选栏保持横向滚动，卡片瀑布流在移动端保持 2 列
6. **无照片状态**：保留现有「暂无照片」提示，样式适配当前主题

## 未来扩展

- 新增分类时，只需在 `themes.css` 中添加一套新的 `[data-theme="xxx"]` 变量定义
- 可考虑为每个分类添加独立的封面头图区域
- 可考虑添加分类切换时的淡入淡出过渡动画
