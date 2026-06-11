import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText } from "ai";
import { getFourLayerContext } from "../../lib/context.js";
import { buildOutlinePrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = new Hono<{ Variables: { userId: string } }>();
router.use(authMiddleware);

const bodySchema = z.object({
  chapterId: z.string(),
});

/**
 * POST /api/ai/outline
 * 为指定章节生成大纲预览（自动驾驶前的第一步）
 * 返回结构化大纲 JSON，前端展示后用户可编辑确认再触发 autopilot
 */
router.post("/", zValidator("json", bodySchema), async (c) => {
  const userId = c.get("userId") as string;
  const { chapterId } = c.req.valid("json");

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
  const { system, prompt } = buildOutlinePrompt(ctx.currentChapter, ctx);

  const { text } = await generateText({
    model,
    system,
    prompt,
    maxTokens: 1200,
  });

  let outline: Record<string, unknown> | null = null;
  let rawText = text;

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      outline = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // 解析失败时返回原始文本
  }

  return c.json({ outline, rawText });
});

export default router;
