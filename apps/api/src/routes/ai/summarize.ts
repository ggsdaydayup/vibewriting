import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { chapters } from "../../db/schema.js";
import { getFourLayerContext } from "../../lib/context.js";
import { buildChapterSummaryPrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = new Hono();
router.use(authMiddleware);

const bodySchema = z.object({
  chapterId: z.string(),
  content: z.string().min(100, "章节内容太短，无法生成摘要"),
  force: z.boolean().optional().default(false),
});

/**
 * POST /api/ai/summarize
 * 为章节生成摘要和结尾快照，写入数据库
 * 通常在用户将章节状态改为 completed 时自动触发，也可手动强制刷新
 */
router.post("/", zValidator("json", bodySchema), async (c) => {
  const userId = c.get("userId") as string;
  const { chapterId, content, force } = c.req.valid("json");

  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.id, chapterId),
  });
  if (!chapter) return c.json({ error: "Chapter not found" }, 404);

  // 如果已有摘要且不强制刷新，直接返回
  if (chapter.summary && !force) {
    return c.json({ summary: chapter.summary, endSnapshot: chapter.endSnapshot });
  }

  let ctx;
  try {
    ctx = await getFourLayerContext(chapterId, userId);
  } catch (e: any) {
    return c.json({ error: e.message }, 404);
  }

  if (!ctx.aiConfig?.apiKey) {
    return c.json({ error: "AI API key not configured" }, 400);
  }

  const model = createAIProvider(ctx.aiConfig);
  const prompt = buildChapterSummaryPrompt(chapter.title, chapter.order, content);

  const { text } = await generateText({
    model,
    prompt,
    maxTokens: 600,
  });

  let summary = "";
  let endSnapshot: Record<string, unknown> | null = null;

  try {
    // 提取 JSON（AI 可能会带 markdown 代码块）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary || text;
      endSnapshot = parsed.endSnapshot || null;
    } else {
      summary = text;
    }
  } catch {
    summary = text;
  }

  await db
    .update(chapters)
    .set({
      summary,
      endSnapshot,
      wordCount: content.replace(/\s/g, "").length,
      updatedAt: new Date(),
    })
    .where(eq(chapters.id, chapterId));

  return c.json({ summary, endSnapshot });
});

export default router;
