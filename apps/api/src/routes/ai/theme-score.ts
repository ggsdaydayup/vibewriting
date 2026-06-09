import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { chapters, projects, userSettings } from "../../db/schema.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { authMiddleware } from "../../middleware/auth.js";
import type { AIProviderConfig } from "@vibewriting/shared";

const router = new Hono();
router.use(authMiddleware);

const bodySchema = z.object({
  chapterId: z.string().uuid(),
  content: z.string().min(100),
});

/**
 * POST /api/ai/theme-score
 *
 * 主旨贡献度评分：
 * 分析章节内容与核心主旨的关联程度，给出 0-100 分和分析理由
 * 分数写入 chapter.themeScore，在节奏仪表盘显示
 */
router.post("/", zValidator("json", bodySchema), async (c) => {
  const userId = c.get("userId") as string;
  const { chapterId, content } = c.req.valid("json");

  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.id, chapterId),
  });
  if (!chapter) return c.json({ error: "Chapter not found" }, 404);

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, chapter.projectId),
  });
  if (!project || project.userId !== userId) return c.json({ error: "Project not found" }, 404);

  if (!project.coreTheme) {
    return c.json({ score: null, reason: "未设置核心主旨，跳过评分" });
  }

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  if (!settings?.aiApiKey) return c.json({ error: "AI API key not configured" }, 400);

  const aiConfig: AIProviderConfig = {
    provider: settings.aiProvider as AIProviderConfig["provider"],
    model: settings.aiModel,
    apiKey: settings.aiApiKey!,
    baseUrl: settings.aiBaseUrl ?? undefined,
  };

  const prompt = `你是文学分析专家。请评估以下章节对核心主旨的贡献程度。

核心主旨：${project.coreTheme}

第${chapter.order}章《${chapter.title}》（前2000字）：
${content.slice(0, 2000)}

评分标准：
- 90-100：章节核心情节直接体现主旨，有深刻的主题升华
- 70-89：主旨在章节中清晰可见，通过人物行动或对话体现
- 50-69：有主旨呼应但不够突出，属于过渡性章节
- 30-49：主旨体现较弱，主要是情节推进章节
- 0-29：与主旨关联很少或感觉偏题

请以 JSON 格式输出（只输出 JSON）：
{
  "score": 评分（整数，0-100）,
  "reason": "一句话说明该章如何体现或未能体现主旨（30字以内）",
  "suggestions": "如何在不改变情节前提下强化主旨体现（可选，30字以内）"
}`;

  const model = createAIProvider(aiConfig);
  const { text } = await generateText({ model, prompt, maxTokens: 300 });

  let score: number | null = null;
  let reason = "";
  let suggestions = "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : null;
      reason = parsed.reason ?? "";
      suggestions = parsed.suggestions ?? "";
    }
  } catch {
    return c.json({ score: null, reason: "解析失败" });
  }

  if (score !== null) {
    await db
      .update(chapters)
      .set({ themeScore: score, themeScoreReason: reason, updatedAt: new Date() })
      .where(eq(chapters.id, chapterId));
  }

  return c.json({ score, reason, suggestions });
});

export default router;
