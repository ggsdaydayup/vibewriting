import { Hono } from "hono";
import { streamText } from "ai";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { getBookContext } from "../../lib/context.js";
import { buildSystemPrompt, buildAutopilotPrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { db, chapters } from "../../db/index.js";

const schema = z.object({
  chapterId: z.string().uuid(),
  vibePrompt: z.string().max(500).optional(),
  targetWordCount: z.number().min(500).max(10000).optional(),
});

export const autopilotRoute = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .post("/", zValidator("json", schema), async (c) => {
    const { chapterId, vibePrompt, targetWordCount } = c.req.valid("json");
    const userId = c.get("userId");

    const ctx = await getBookContext(chapterId, userId);
    if (!ctx.aiConfig?.apiKey) {
      return c.json({ error: "AI provider not configured" }, 400);
    }

    const chapter = await db.query.chapters.findFirst({
      where: eq(chapters.id, chapterId),
    });
    if (!chapter) return c.json({ error: "Chapter not found" }, 404);

    const prevChapter = await db.query.chapters.findFirst({
      where: eq(chapters.projectId, chapter.projectId),
      orderBy: (c, { desc }) => [desc(c.order)],
    });

    const prevSnapshot = prevChapter?.endSnapshot
      ? JSON.stringify(prevChapter.endSnapshot)
      : undefined;

    const systemPrompt = buildSystemPrompt(ctx);
    const { system, prompt } = buildAutopilotPrompt(
      {
        ...chapter,
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString(),
        status: chapter.status as any,
        endSnapshot: chapter.endSnapshot as any,
      },
      vibePrompt,
      systemPrompt,
      prevSnapshot
    );

    const { model } = createAIProvider(ctx.aiConfig);
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
