# vibewriting 部署指南

完整部署栈：**Supabase**（数据库 + 认证）+ **Railway**（API 后端）+ **Vercel**（前端）

---

## 第一步：Supabase 数据库初始化

### 1.1 创建项目

1. 前往 [supabase.com](https://supabase.com) 注册并创建新项目
2. 记录以下信息（Settings → API）：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public` key
   - `service_role` key（保密，只给后端用）
3. 记录数据库连接串（Settings → Database → Connection string → URI）

### 1.2 执行建表 SQL

1. 进入 Supabase Dashboard → **SQL Editor**
2. 新建查询，粘贴 `supabase/migrations/0001_schema.sql` 的全部内容
3. 点击 **Run** 执行

所有表、索引、RLS 策略会自动创建。

### 1.3 配置 Auth

1. Authentication → Providers → Email：开启「Enable Email Signups」
2. Authentication → URL Configuration：
   - Site URL 填写前端域名（如 `https://your-app.vercel.app`）
   - Redirect URLs 添加同一域名

---

## 第二步：部署 API（Railway）

### 2.1 创建 Railway 项目

1. 前往 [railway.app](https://railway.app)，新建项目
2. 选择「Deploy from GitHub repo」，选择 `vibewriting` 仓库
3. Railway 会自动读取根目录的 `railway.toml`，使用 `apps/api/Dockerfile` 构建

### 2.2 设置环境变量

在 Railway 项目 → Variables 中添加：

| 变量名 | 值 |
|--------|-----|
| `PORT` | `3001` |
| `SUPABASE_URL` | 你的 Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 你的 service_role key |
| `DATABASE_URL` | Supabase 数据库连接串（Transaction mode，端口 6543） |
| `ALLOWED_ORIGINS` | `https://your-app.vercel.app`（前端部署后填写） |

### 2.3 获取 API 地址

部署成功后，Railway 会分配一个域名，形如：
```
https://vibewriting-api-production.up.railway.app
```
记录这个地址，下一步需要用到。

---

## 第三步：部署前端（Vercel）

### 3.1 更新 vercel.json

打开 `vercel.json`，将 `rewrites` 中的 `YOUR_RAILWAY_APP` 替换为你的 Railway 域名：

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://vibewriting-api-production.up.railway.app/api/:path*"
    }
  ]
}
```

提交这个修改：
```bash
git add vercel.json && git commit -m "chore: set railway api url" && git push
```

### 3.2 创建 Vercel 项目

1. 前往 [vercel.com](https://vercel.com)，Import GitHub 仓库
2. 框架选 **Other**（不要选 Next.js）
3. Build Command：`pnpm --filter web build`
4. Output Directory：`apps/web/dist`
5. Install Command：`pnpm install`

### 3.3 设置环境变量

在 Vercel 项目 → Settings → Environment Variables 添加：

| 变量名 | 值 |
|--------|-----|
| `VITE_SUPABASE_URL` | 你的 Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | 你的 anon public key |

> `VITE_API_URL` 不需要设置，Vercel 的 `rewrites` 规则会把 `/api/*` 转发到 Railway。

### 3.4 触发部署

Vercel 会自动部署，或手动点击 **Redeploy**。
部署完成后访问 Vercel 分配的域名即可。

---

## 第四步：更新 Railway ALLOWED_ORIGINS

前端部署完成后，回到 Railway → Variables，将 `ALLOWED_ORIGINS` 更新为真实的 Vercel 域名：

```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

Railway 会自动重新部署。

---

## 本地开发

```bash
# 1. 复制环境变量模板
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 2. 填写 .env 中的 Supabase 信息

# 3. 安装依赖
pnpm install

# 4. 同时启动前端（:5173）和 API（:3001）
pnpm dev
```

---

## 架构总览

```
用户浏览器 / Tauri 桌面端
       │
       ▼
  Vercel (前端 SPA)
   apps/web/dist
       │  /api/* rewrites
       ▼
  Railway (Hono.js API)
   apps/api/src/index.ts
       │
       ├── Supabase Auth (JWT 验证)
       └── Supabase PostgreSQL (数据存储)
```

---

## 常见问题

**Q: 部署后登录跳转不对？**
检查 Supabase → Authentication → URL Configuration，Site URL 是否填写了正确的 Vercel 域名。

**Q: API 返回 CORS 错误？**
确认 Railway 环境变量 `ALLOWED_ORIGINS` 包含了你的 Vercel 域名（不要带尾部斜杠）。

**Q: 数据库连接失败？**
`DATABASE_URL` 使用 Transaction mode（端口 6543），不要用 Direct connection（端口 5432），Railway 的网络层不支持直连。

**Q: 如何绑定自定义域名？**
- Vercel：项目 → Domains → Add Domain
- Railway：项目 → Settings → Networking → Custom Domain
- 绑定后同步更新 Supabase Site URL 和 Railway `ALLOWED_ORIGINS`
