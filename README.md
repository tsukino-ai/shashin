# Shashin — 个人写真照片墙

## 部署步骤

1. 创建 R2 Bucket
   ```bash
   wrangler r2 bucket create shashin-photos
   ```

2. 设置 Bucket 为 Public
   - Cloudflare 控制台 → R2 → shashin-photos → Settings → Allow Public Access

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
