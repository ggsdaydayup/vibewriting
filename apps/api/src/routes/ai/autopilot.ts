import { Hono } from "hono";
import { streamText } from "ai";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, lt } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { getFourLayerContext } from "../../lib/context.js";
import { buildFourLayerSystemPrompt, buildAutopilotPrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { db, chapters } from "../../db/index.js";

const schema = z.object({
  chapterId: z.string().uuid(),
  vibePrompt: z.string().max(500).optional(),
  targetWordCount: z.number().min(500).max(10000).optional(),
  approvedOutline: z.string().optional(), // 用户确认过的大纲（JSON 字符串）
});

export const autopilotRoute = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .post("/", zValidator("json", schema), async (c) => {
    const { chapterId, vibePrompt, targetWordCount, approvedOutline } = c.req.valid("json");
    const userId = c.get("userId");

    const ctx = await getFourLayerContext(chapterId, userId);
    if (!ctx.aiConfig?.apiKey) {
      return c.json({ error: "AI provider not configured" }, 400);
    }

    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
    });
    if (!chapter) return c.json({ error: "Chapter not found" }, 404);

    // 取前一章的 endSnapshot 作为章间连接锚点
    const prevChapter = await db.query.chapters.findFirst({
      where: (c, { and, eq, lt }) => and(
        eq(c.projectId, chapter.projectId),
        lt(c.order, chapter.order)
      ),
      orderBy: (c, { desc }) => [desc(c.order)],
    });

    const prevSnapshot = prevChapter?.endSnapshot
      ? JSON.stringify(prevChapter.endSnapshot)
      : undefined;

    const systemPrompt = buildFourLayerSystemPrompt(ctx);
    const { system, prompt } = buildAutopilotPrompt(
      {
        ...chapter,
        content: chapter.content ?? undefined,
        summary: chapter.summary ?? undefined,
        vibePrompt: chapter.vibePrompt ?? undefined,
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString(),
        status: chapter.status as any,
        endSnapshot: chapter.endSnapshot as any,
      },
      vibePrompt,
      systemPrompt,
      prevSnapshot,
      approvedOutline
    );

    const model = createAIProvider(ctx.aiConfig);
    const wordHint = targetWordCount
      ? `\n请控制字数在 ${targetWordCount} 字左右。`
      : "";

    const result = streamText({
      model,
      system,
      prompt: prompt + wordHint,
      maxTokens: 6000,
      temperature: 0.85,
    });

    return result.toTextStreamResponse();
  });
