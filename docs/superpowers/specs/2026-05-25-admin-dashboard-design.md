# 图片管理后台设计

## 目标
创建一个 `/manage` 管理后台页面，支持批量操作、视图切换、筛选排序，提升图片管理效率。

## 页面结构

```
/manage
├── 顶部统计栏
│   ├── 总张数
│   ├── 总存储大小
│   └── 本月上传数量
├── 视图切换 + 筛选工具栏
│   ├── [列表视图] [网格视图] 切换按钮
│   ├── 分类下拉筛选
│   ├── 排序方式（时间新旧 / 大小 / 名称）
│   └── 刷新按钮
├── 批量操作栏（有选中项时显示）
│   ├── 全选 / 取消全选
│   ├── 批量删除
│   └── 复制选中链接（Markdown / URL）
└── 图片展示区
    ├── 列表视图：表格，每行缩略图 + 文件名 + 分类 + 日期 + 大小 + 操作
    └── 网格视图：Masonry + 复选框 + 悬停操作
```

## 组件设计

| 组件 | 职责 |
|---|---|
| `ManagePage.astro` | 页面容器，获取数据，传递 props |
| `ManageToolbar.jsx` | 顶部统计 + 视图切换 + 筛选 + 批量操作 |
| `PhotoList.jsx` | 列表视图，表格渲染，checkbox 选择 |
| `PhotoGridManage.jsx` | 网格视图，Masonry + checkbox + 悬停操作 |
| `DeleteConfirmModal.jsx` | 删除确认弹窗 |

## 数据流

```
ManagePage.astro (SSR)
  → list R2 所有对象
  → 提取 metadata（分类、日期、大小、宽高）
  → 传给 ManageToolbar + PhotoList/PhotoGridManage

ManageToolbar (React state)
  → viewMode: 'list' | 'grid'
  → selectedKeys: Set<string>
  → filterCategory: string
  → sortBy: 'date-desc' | 'date-asc' | 'size-desc' | 'name'

PhotoList / PhotoGridManage
  → 接收 photos 数组
  → 根据 filter/sort 本地过滤排序
  → checkbox 选中更新 ManageToolbar 的 selectedKeys
  → 批量删除调用 DELETE /api/upload?key=xxx（循环）
```

## API 设计

复用现有 `DELETE /api/upload?key=xxx`，前端循环调用即可。

## 认证

`/manage` 路径加入 Cloudflare Access 保护（和 `/upload*` 一样）。

## 视图细节

### 列表视图
| 列 | 内容 |
|---|---|
| 选择 | checkbox |
| 缩略图 | 60x60，点击预览 |
| 文件名 | `timestamp-uuid.jpg` |
| 分类 | 标签样式 |
| 日期 | `YYYY-MM-DD HH:mm` |
| 大小 | `2.4 MB` |
| 操作 | 复制链接 / 删除 |

### 网格视图
- Masonry 2/3/4 列
- 每张图左上角 checkbox
- 悬停显示：复制链接、删除、预览按钮

## 批量操作
- 全选：选中当前筛选结果的所有图片
- 批量删除：弹窗确认，显示"确定删除 X 张图片？"
- 复制链接：复制为 Markdown `![desc](url)` 或纯 URL
