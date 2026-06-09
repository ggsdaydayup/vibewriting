import { Hono } from "hono";
import { streamText } from "ai";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { getBookContext } from "../../lib/context.js";
import { buildSystemPrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";

const schema = z.object({
  chapterId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

export const chatRoute = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .post("/", zValidator("json", schema), async (c) => {
    const { chapterId, messages } = c.req.valid("json");
    const userId = c.get("userId");

    const ctx = await getBookContext(chapterId, userId);
    if (!ctx.aiConfig?.apiKey) {
      return c.json({ error: "AI provider not configured" }, 400);
    }

    const systemPrompt = buildSystemPrompt(ctx);
    const model = createAIProvider(ctx.aiConfig);

    const result = streamText({
      model,
      system:
        systemPrompt +
        "\n\n你现在是写作助手模式，与作者对话协助创作。可以讨论剧情、帮助写段落、提供建议。",
      messages,
      maxTokens: 2000,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  });
