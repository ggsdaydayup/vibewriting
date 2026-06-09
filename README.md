# vibewriting

以**人设（Persona）驱动**的 AI 写作工具，特化支持长篇小说/网文，交互风格对标 Cursor。

## 特性

- **Persona 系统**：定义写作风格，AI 始终以你的语气创作
- **幽灵续写**：停顿后自动出现续写建议，Tab 接受，Esc 拒绝
- **Cmd+K 内联编辑**：选中文字，快速改写/扩写/换语气
- **自动驾驶**：AI 全自动写完整章节，支持审阅和重写
- **写作助手**：上下文感知的对话助手，知道你在写什么
- **书籍状态管理**：人物卡片、世界观条目、章节树
- **多模型支持**：Claude / GPT-4o / DeepSeek / 通义千问，自配 API Key

## 技术栈

- **前端**: React 19 + Vite（SPA，支持 Tauri 打包）
- **后端**: Hono.js（流式 AI 路由）
- **桌面端**: Tauri 2.0（Windows / Mac / Linux）
- **AI**: Vercel AI SDK（统一多模型接入）
- **数据库**: Supabase PostgreSQL + 本地 SQLite（Tauri 端）

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- （桌面端）Rust 1.77+

### 配置环境变量

```bash
# apps/web/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# apps/api/.env
PORT=3001
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 安装依赖

```bash
pnpm install
```

### 启动 Web 开发服务器

```bash
# 同时启动 API（:3001）和前端（:5173）
pnpm dev
```

### 启动 Tauri 桌面端（需要 Rust）

```bash
# 安装 Rust: https://rustup.rs
pnpm dev:tauri
```

### 构建

```bash
# Web
pnpm build

# 桌面端
pnpm build:tauri
```

## 项目结构

```
vibewriting/
├── apps/
│   ├── web/          # React + Vite 前端
│   └── api/          # Hono.js 后端 API
├── packages/
│   └── shared/       # 共享 TypeScript 类型
└── src-tauri/        # Tauri 2.0 桌面端配置
    ├── src/          # Rust 源码
    ├── migrations/   # SQLite 本地 schema
    └── capabilities/ # Tauri 权限配置
```

## 路线图

- **Phase 1**（当前）：Persona 系统、编辑器核心、AI 四种模式、书籍状态管理
- **Phase 2**：四层记忆架构、章节预检卡、伏笔追踪器、节奏仪表盘
- **Phase 3**：人设行为学习、角色弧光追踪、主旨贡献度分析
