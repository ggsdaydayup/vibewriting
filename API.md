# vibewriting API 文档

**Base URL（本地开发）**：`http://localhost:3001`

**认证方式**：`Authorization: Bearer <accessToken>`

> 开发调试阶段（`DEV_BYPASS_AUTH=true`）无需 Token，所有请求直接通过。

---

## 通用规范

- 请求体格式：`Content-Type: application/json`
- 时间字段：ISO 8601 字符串（`2024-01-01T00:00:00.000Z`）
- ID 字段：UUID v4
- 错误响应：`{ "error": "错误描述" }`，HTTP 状态码 4xx/5xx

---

## 认证 `/api/auth`

### 注册
```
POST /api/auth/register
Body: { "email": string, "password": string }  // password 至少 8 位
Response 201: { "accessToken": string, "refreshToken": string, "user": { "id": string, "email": string } }
Error 409: 邮箱已注册
```

### 登录
```
POST /api/auth/login
Body: { "email": string, "password": string }
Response 200: { "accessToken": string, "refreshToken": string, "user": { "id": string, "email": string } }
Error 401: 邮箱或密码错误
```

### 刷新 Token
```
POST /api/auth/refresh
Body: { "refreshToken": string }
Response 200: { "accessToken": string }
Error 401: Token 无效或过期
```

### 获取当前用户
```
GET /api/auth/me
Response 200: { "id": string, "email": string }
```

---

## 项目 `/api/projects`

### 项目数据结构
```typescript
{
  id: string            // UUID
  userId: string
  title: string
  description: string | null
  genre: string | null  // 类型，如"玄幻"、"现代文"
  coverUrl: string | null
  personaId: string | null  // 绑定的人设 ID
  coreTheme: string | null  // 核心主旨（AI 主题评分依据）
  createdAt: string
  updatedAt: string
}
```

### 获取项目列表
```
GET /api/projects
Response: Project[]  // 按 updatedAt 倒序
```

### 创建项目
```
POST /api/projects
Body: {
  "title": string,         // 必填，1-100字
  "description"?: string,  // 最多500字
  "genre"?: string,        // 最多50字
  "coreTheme"?: string,    // 最多500字，设置后可使用主题评分
  "personaId"?: string     // UUID，绑定写作人设
}
Response 201: Project
```

### 获取单个项目
```
GET /api/projects/:id
Response: Project
Error 404: 不存在或无权限
```

### 更新项目
```
PATCH /api/projects/:id
Body: 与创建相同，所有字段可选
Response: Project
```

### 删除项目
```
DELETE /api/projects/:id
Response: { "success": true }
```

---

## 章节 `/api/chapters`

### 章节数据结构
```typescript
{
  id: string
  projectId: string
  title: string
  order: number           // 章节序号，从 1 开始
  content: string | null  // 正文（富文本 HTML 或纯文本）
  summary: string | null  // AI 生成的摘要（章节完成后）
  status: "draft" | "outline" | "completed"
  vibePrompt: string | null  // 本章 AI 提示词（可空，Autopilot 使用）
  wordCount: number          // 字数，保存时自动统计
  endSnapshot: object | null // AI 生成的章节结尾快照（人物状态等）
  themeScore: number | null  // 主题贡献度评分 0-100
  themeScoreReason: string | null
  writingDurationSec: number | null  // 写作时长（秒）
  createdAt: string
  updatedAt: string
}
```

### 获取项目的所有章节
```
GET /api/chapters/project/:projectId
Response: Chapter[]  // 按 order 升序
```

### 创建章节
```
POST /api/chapters
Body: {
  "projectId": string,  // UUID，必填
  "title": string,      // 必填，1-200字
  "order": number       // 必填，从 1 开始的整数
}
Response 201: Chapter
```

### 获取单章节
```
GET /api/chapters/:id
Response: Chapter
```

### 更新章节
```
PATCH /api/chapters/:id
Body: {
  "title"?: string,
  "content"?: string,        // 保存时 wordCount 自动重算
  "summary"?: string,
  "status"?: "draft" | "outline" | "completed",
  "vibePrompt"?: string,     // 最多500字
  "endSnapshot"?: object
}
Response: Chapter
```

### 删除章节
```
DELETE /api/chapters/:id
Response: { "success": true }
```

---

## 人设 `/api/personas`

### 人设数据结构
```typescript
{
  id: string
  userId: string
  name: string
  description: string | null
  styleTags: string[]         // 风格标签，如 ["硬核爽文", "快节奏"]
  toneWords: string[]         // 语气词，如 ["热血", "幽默"]
  hardRules: string[]         // 强制规则，如 ["不用被动语态"]
  bannedWords: string[]       // 禁用词汇
  sampleTexts: string[]       // 写作样本（用于风格学习）
  extractedPatterns: object | null  // AI 提取的写作规律
  systemPromptFragment: string | null  // 编译后的 AI 提示词片段
  createdAt: string
  updatedAt: string
}
```

### 获取人设列表
```
GET /api/personas
Response: Persona[]
```

### 创建人设
```
POST /api/personas
Body: {
  "name": string,           // 必填，1-50字
  "description"?: string,
  "styleTags"?: string[],
  "toneWords"?: string[],
  "hardRules"?: string[],
  "bannedWords"?: string[],
  "sampleTexts"?: string[], // 写作样本列表
  "extractedPatterns"?: object
}
Response 201: Persona
```

### 更新人设
```
PATCH /api/personas/:id
Body: 与创建相同，所有字段可选
Response: Persona
```

### 删除人设
```
DELETE /api/personas/:id
Response: { "success": true }
```

---

## 角色卡 `/api/characters`

### 角色数据结构
```typescript
{
  id: string
  projectId: string
  name: string
  role: "protagonist" | "deuteragonist" | "antagonist" | "supporting"
  description: string | null  // 人物介绍
  startState: string | null   // 起始状态（用于弧光追踪）
  currentState: string | null // 当前状态（AI 自动更新）
  endState: string | null     // 目标结局状态
  behaviorRules: string[]     // 行为准则，如 ["不会主动求援"]
  arcMilestones: Array<{      // 弧光里程碑（AI 自动打标）
    description: string
    reached: boolean
    reachedAt?: number        // 第几章达成
  }> | null
  createdAt: string
  updatedAt: string
}
```

### 获取项目的角色列表
```
GET /api/characters/project/:projectId
Response: Character[]
```

### 创建角色
```
POST /api/characters
Body: {
  "projectId": string,
  "name": string,
  "role": "protagonist" | "deuteragonist" | "antagonist" | "supporting",
  "description"?: string,
  "currentState"?: string,
  "startState"?: string,
  "endState"?: string,
  "behaviorRules"?: string[]
}
Response 201: Character
```

### 更新角色
```
PATCH /api/characters/:id
Body: 除 projectId 外，所有字段可选
Response: Character
```

### 删除角色
```
DELETE /api/characters/:id
Response: { "success": true }
```

---

## 伏笔 `/api/foreshadowings`

### 伏笔数据结构
```typescript
{
  id: string
  projectId: string
  description: string           // 伏笔描述
  plantedChapter: number        // 埋下伏笔的章节序号
  plannedCollection?: number    // 计划回收的章节序号
  collectedChapter?: number     // 实际回收的章节序号
  status: "planted" | "due_soon" | "collected" | "abandoned"
  relatedCharacters: string[]   // 相关人物名称
  createdAt: string
  updatedAt: string
}
```

### 获取项目的伏笔列表
```
GET /api/foreshadowings/project/:projectId
Response: Foreshadowing[]  // 按 plantedChapter 升序
```

### 创建伏笔
```
POST /api/foreshadowings
Body: {
  "projectId": string,
  "description": string,         // 最多500字
  "plantedChapter": number,
  "plannedCollection"?: number,
  "relatedCharacters"?: string[]
}
Response 201: Foreshadowing
```

### 更新伏笔
```
PATCH /api/foreshadowings/:id
Body: {
  "description"?: string,
  "plannedCollection"?: number,
  "collectedChapter"?: number,
  "status"?: "planted" | "due_soon" | "collected" | "abandoned",
  "relatedCharacters"?: string[]
}
Response: Foreshadowing
```

### 删除伏笔
```
DELETE /api/foreshadowings/:id
Response: { "success": true }
```

---

## 世界观笔记 `/api/world-notes`

### 笔记数据结构
```typescript
{
  id: string
  projectId: string
  category: string   // 分类，如 "地理"、"魔法体系"、"势力"，默认 "general"
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
```

### 获取项目的世界观笔记
```
GET /api/world-notes/project/:projectId
Response: WorldNote[]  // 按 category 和 title 升序
```

### 创建笔记
```
POST /api/world-notes
Body: {
  "projectId": string,
  "category"?: string,  // 默认 "general"
  "title": string,
  "content": string
}
Response 201: WorldNote
```

### 更新笔记
```
PATCH /api/world-notes/:id
Body: { "category"?: string, "title"?: string, "content"?: string }
Response: WorldNote
```

### 删除笔记
```
DELETE /api/world-notes/:id
Response: { "success": true }
```

---

## 设置 `/api/settings`

### 获取 AI 配置
```
GET /api/settings
Response: {
  "aiProvider": "openai" | "anthropic" | "deepseek" | "qwen" | "custom",
  "aiModel": string,
  "aiApiKey": "••••••••",  // 脱敏
  "aiBaseUrl": string | null
}
```

### 更新 AI 配置
```
PUT /api/settings
Body: {
  "aiProvider": "openai" | "anthropic" | "deepseek" | "qwen" | "custom",
  "aiModel": string,
  "aiApiKey": string,
  "aiBaseUrl"?: string  // custom provider 时填写
}
Response: 同 GET
```

### 获取预设 Provider 列表
```
GET /api/settings/providers
Response: {
  "openai": { "name": "OpenAI", "models": ["gpt-4o", "gpt-4o-mini", ...], "baseUrl": "..." },
  "anthropic": { ... },
  "deepseek": { ... },
  "qwen": { ... }
}
```

---

## AI 接口 `/api/ai`

> 所有 AI 接口需要用户已配置 AI Key（`PUT /api/settings`），否则返回 400。
> 流式接口返回 `text/event-stream`，数据格式兼容 Vercel AI SDK。

---

### 幽灵补全（Ghost Text）
```
POST /api/ai/complete
Body: {
  "chapterId": string,    // UUID
  "recentText": string    // 光标前最近 2000 字以内的文字
}
Response: SSE 流式文本（约 200 token，补全续写）
```

### AI 对话
```
POST /api/ai/chat
Body: {
  "chapterId": string,
  "messages": [
    { "role": "user" | "assistant", "content": string }
  ]
}
Response: SSE 流式文本（对话回复，最多 2000 token）
```

### 生成章节大纲（Autopilot Step 1）
```
POST /api/ai/outline
Body: { "chapterId": string }
Response: {
  "outline": {               // 结构化大纲（可能为 null，此时用 rawText）
    "summary": string,       // 本章概要
    "keyEvents": string[],   // 关键事件列表
    "opening": string,       // 开场描述
    "climax": string,        // 高潮/转折
    "ending": string,        // 结尾描述
    "emotionalArc": string   // 情绪弧线
  } | null,
  "rawText": string          // AI 原始输出（outline 解析失败时使用）
}
```

### 全自动写章节（Autopilot Step 2）
```
POST /api/ai/autopilot
Body: {
  "chapterId": string,
  "vibePrompt"?: string,        // 本章创作提示（最多500字）
  "targetWordCount"?: number,   // 目标字数 500-10000
  "approvedOutline"?: string    // 用户确认的大纲（JSON 字符串，来自 /outline）
}
Response: SSE 流式文本（完整章节正文，最多 6000 token）
```

### 生成章节摘要（章节完成后触发）
```
POST /api/ai/summarize
Body: {
  "chapterId": string,
  "content": string,   // 章节正文（至少100字）
  "force"?: boolean    // true = 强制重新生成（默认 false，已有摘要则跳过）
}
Response: {
  "summary": string,         // 章节摘要（100-200字）
  "endSnapshot": {           // 章节结尾快照（用于下一章连接）
    "location": string,      // 当前场景地点
    "mainCharacters": string[], // 在场人物
    "mood": string,          // 情绪氛围
    "cliffhanger": string,   // 悬念/未解决冲突
    "lastSentence": string   // 最后一句话
  } | null
}
```

### 一致性检查（打开章节时触发）
```
POST /api/ai/consistency-check
Body: { "chapterId": string }
Response: {
  "issues": [
    {
      "type": "character" | "world" | "plot" | "timeline",
      "severity": "warning" | "error",
      "description": string
    }
  ],
  "reminders": string[]  // 需要注意的提醒事项
}
```

### 人设风格学习
```
POST /api/ai/persona-learn
Body: {
  "personaId": string,
  "writtenContent": string  // 作者写作样本（建议 500 字以上）
}
Response: {
  "updatedPatterns": {       // 更新后的风格规律
    "avgSentenceLength": number,
    "punctuationStyle": string,
    "vocabularyLevel": string,
    "imageryTypes": string[],
    "syntaxPatterns": string[],
    "writingRhythm": string,
    "emotionalTone": string,
    "commonTransitions": string[],
    "learnedSamples": number   // 累计学习次数
  },
  "systemPromptFragment": string,  // 更新后的提示词片段
  "learnedSamples": number
}
```

### 角色弧光推进（章节完成后触发）
```
POST /api/ai/arc-advance
Body: {
  "chapterId": string,
  "content": string   // 章节正文（至少100字）
}
Response: {
  "updates": [
    {
      "characterName": string,
      "newCurrentState": string,
      "reachedMilestones": string[],
      "stateChanged": boolean
    }
  ],
  "applied": string[]  // 实际写入数据库的人物名称列表
}
```

### 主题贡献度评分（章节完成后触发）
```
POST /api/ai/theme-score
Body: {
  "chapterId": string,
  "content": string   // 章节正文（至少100字）
}
Response: {
  "score": number | null,   // 0-100，null 表示未设置核心主旨
  "reason": string,         // 一句话评分理由
  "suggestions": string     // 强化主旨的建议（可选）
}
```

---

## 典型工作流

### 写作流程
```
1. POST /api/projects          创建项目（设置 coreTheme、绑定 personaId）
2. POST /api/chapters          创建章节
3. GET  /api/ai/outline        生成大纲预览
4. POST /api/ai/autopilot      全自动写章节（传入确认的大纲）
   或 POST /api/ai/complete    光标处幽灵补全
   或 POST /api/ai/chat        与 AI 对话协作
5. PATCH /api/chapters/:id     保存正文（content + status: completed）
6. POST /api/ai/summarize      生成章节摘要和结尾快照
7. POST /api/ai/arc-advance    更新角色状态（可选）
8. POST /api/ai/theme-score    评分主题贡献（可选）
```

### 章节完成后自动触发（批量）
```javascript
// 章节标记完成时，后台并行触发三个分析
await Promise.all([
  fetch('/api/ai/summarize',   { method: 'POST', body: JSON.stringify({ chapterId, content }) }),
  fetch('/api/ai/arc-advance', { method: 'POST', body: JSON.stringify({ chapterId, content }) }),
  fetch('/api/ai/theme-score', { method: 'POST', body: JSON.stringify({ chapterId, content }) }),
])
```

---

## SSE 流式数据格式

AI 流式接口返回 Vercel AI SDK 格式，逐块读取示例：

```javascript
const res = await fetch('/api/ai/autopilot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ chapterId, vibePrompt })
})

const reader = res.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const chunk = decoder.decode(value, { stream: true })
  for (const line of chunk.split('\n')) {
    if (line.startsWith('0:')) {
      const text = JSON.parse(line.slice(2))  // 提取文本块
      console.log(text)
    }
  }
}
```
