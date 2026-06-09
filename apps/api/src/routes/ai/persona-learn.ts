import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { personas, userSettings } from "../../db/schema.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { compilePersonaFragment } from "../../lib/ai/prompts.js";
import { authMiddleware } from "../../middleware/auth.js";
import type { AIProviderConfig } from "@vibewriting/shared";

const router = new Hono();
router.use(authMiddleware);

const bodySchema = z.object({
  personaId: z.string().uuid(),
  writtenContent: z.string().min(200, "内容太短，至少需要200字"),
});

/**
 * POST /api/ai/persona-learn
 *
 * 人设行为学习：用户实际写作内容 → AI 分析风格增量 →
 * 合并到 persona.extractedPatterns，并重新生成 systemPromptFragment
 *
 * 每次调用不覆盖，而是在现有 patterns 基础上「学习」新内容，逐步迭代。
 */
router.post("/", zValidator("json", bodySchema), async (c) => {
  const userId = c.get("userId") as string;
  const { personaId, writtenContent } = c.req.valid("json");

  const persona = await db.query.personas.findFirst({
    where: eq(personas.id, personaId),
  });
  if (!persona || persona.userId !== userId) {
    return c.json({ error: "Persona not found" }, 404);
  }

  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  if (!settings?.aiApiKey) {
    return c.json({ error: "AI API key not configured" }, 400);
  }

  const aiConfig: AIProviderConfig = {
    provider: settings.aiProvider as AIProviderConfig["provider"],
    model: settings.aiModel,
    apiKey: settings.aiApiKey!,
    baseUrl: settings.aiBaseUrl ?? undefined,
  };

  const existingPatterns = (persona.extractedPatterns as Record<string, unknown>) ?? {};

  const prompt = `你是写作风格分析专家。请分析以下写作样本，提取作者的写作习惯增量，并与已有的风格档案合并，输出更新后的风格档案。

已有风格档案：
${JSON.stringify(existingPatterns, null, 2)}

新写作样本（约${writtenContent.length}字）：
${writtenContent.slice(0, 3000)}${writtenContent.length > 3000 ? "\n[已截断]" : ""}

请以 JSON 格式输出更新后的完整风格档案（不要输出任何解释，只输出 JSON）：
{
  "avgSentenceLength": 更新后的平均句子字数（数字）,
  "punctuationStyle": "标点使用特点的更新描述",
  "vocabularyLevel": "词汇层次的更新描述",
  "imageryTypes": ["更新后的意象类型数组，最多6个"],
  "syntaxPatterns": ["更新后的句式特点数组，最多6个"],
  "writingRhythm": "行文节奏描述（新增）",
  "emotionalTone": "情感基调描述（新增）",
  "commonTransitions": ["常用过渡/转场手法，最多4个"],
  "learnedSamples": 已学习的样本数（累计，上次基础+1）
}`;

  const model = createAIProvider(aiConfig);
  const { text } = await generateText({ model, prompt, maxTokens: 800 });

  let updatedPatterns: Record<string, unknown> = existingPatterns;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      updatedPatterns = JSON.parse(jsonMatch[0]);
    }
  } catch {
    return c.json({ error: "解析 AI 输出失败，请重试" }, 500);
  }

  // 重新生成 systemPromptFragment
  const updatedFragment = compilePersonaFragment({
    name: persona.name,
    description: persona.description ?? undefined,
    styleTags: (persona.styleTags as string[]) ?? [],
    toneWords: (persona.toneWords as string[]) ?? [],
    hardRules: (persona.hardRules as string[]) ?? [],
    bannedWords: (persona.bannedWords as string[]) ?? [],
    extractedPatterns: updatedPatterns as any,
  });

  await db
    .update(personas)
    .set({
      extractedPatterns: updatedPatterns,
      systemPromptFragment: updatedFragment,
      updatedAt: new Date(),
    })
    .where(eq(personas.id, personaId));

  return c.json({
    updatedPatterns,
    systemPromptFragment: updatedFragment,
    learnedSamples: (updatedPatterns.learnedSamples as number) ?? 1,
  });
});

export default router;
