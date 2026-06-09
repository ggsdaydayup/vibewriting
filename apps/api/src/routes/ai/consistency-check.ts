import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText } from "ai";
import { getFourLayerContext } from "../../lib/context.js";
import { buildConsistencyCheckPrompt } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = new Hono();
router.use(authMiddleware);

const bodySchema = z.object({
  chapterId: z.string(),
});

/**
 * POST /api/ai/consistency-check
 * 写章节前检查全局一致性
 * 返回 issues 列表和 reminders，前端在 WritePage 打开章节时展示
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
  const prompt = buildConsistencyCheckPrompt(ctx.currentChapter, ctx);

  const { text } = await generateText({
    model,
    prompt,
    maxTokens: 800,
  });

  let result: {
    issues: Array<{ severity: string; type: string; description: string; suggestion: string }>;
    reminders: string[];
    overallStatus: string;
  } = { issues: [], reminders: [], overallStatus: "clean" };

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // 解析失败返回空结果
  }

  return c.json(result);
});

export default router;
