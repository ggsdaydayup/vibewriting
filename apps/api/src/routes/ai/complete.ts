import { Hono } from "hono";
import { streamText } from "ai";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { getBookContext } from "../../lib/context.js";
import { buildSystemPrompt, buildCompletionPrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";

const schema = z.object({
  chapterId: z.string().uuid(),
  recentText: z.string().max(2000),
});

export const completeRoute = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .post("/", zValidator("json", schema), async (c) => {
    const { chapterId, recentText } = c.req.valid("json");
    const userId = c.get("userId");

    const ctx = await getBookContext(chapterId, userId);
    if (!ctx.aiConfig?.apiKey) {
      return c.json({ error: "AI provider not configured" }, 400);
    }

    const systemPrompt = buildSystemPrompt(ctx);
    const { system, prompt } = buildCompletionPrompt(recentText, systemPrompt);
    const { model } = createAIProvider(ctx.aiConfig);

    const result = streamText({
      model,
      system,
      prompt,
      maxTokens: 200,
      temperature: 0.8,
    });

    return result.toTextStreamResponse();
  });
