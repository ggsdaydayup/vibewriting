import { Hono } from "hono";
import { streamText } from "ai";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../../middleware/auth.js";
import { getBookContext } from "../../lib/context.js";
import { buildSystemPrompt, buildInlineEditPrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";

const schema = z.object({
  chapterId: z.string().uuid(),
  selectedText: z.string().max(5000),
  instruction: z.string().max(500),
  surroundingContext: z.string().max(1000).optional(),
});

export const inlineRoute = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .post("/", zValidator("json", schema), async (c) => {
    const { chapterId, selectedText, instruction, surroundingContext } =
      c.req.valid("json");
    const userId = c.get("userId");

    const ctx = await getBookContext(chapterId, userId);
    if (!ctx.aiConfig?.apiKey) {
      return c.json({ error: "AI provider not configured" }, 400);
    }

    const systemPrompt = buildSystemPrompt(ctx);
    const { system, prompt } = buildInlineEditPrompt(
      selectedText,
      instruction,
      surroundingContext ?? "",
      systemPrompt
    );
    const model = createAIProvider(ctx.aiConfig);

    const result = streamText({
      model,
      system,
      prompt,
      maxTokens: 1000,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  });
