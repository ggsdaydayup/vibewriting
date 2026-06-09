import { Hono } from "hono";
import { generateText } from "ai";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../../middleware/auth.js";
import { buildPersonaAnalysisPrompt, compilePersonaFragment } from "../../lib/ai/prompts.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { db, userSettings } from "../../db/index.js";
import type { AIProviderConfig, PersonaAnalysisResult } from "@vibewriting/shared";

const schema = z.object({
  sampleTexts: z.array(z.string().min(50)).min(1).max(3),
});

export const analyzePersonaRoute = new Hono<{ Variables: { userId: string } }>()
  .use(authMiddleware)
  .post("/", zValidator("json", schema), async (c) => {
    const { sampleTexts } = c.req.valid("json");
    const userId = c.get("userId");

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    });

    if (!settings?.aiApiKey) {
      return c.json({ error: "AI provider not configured" }, 400);
    }

    const aiConfig: AIProviderConfig = {
      provider: settings.aiProvider as AIProviderConfig["provider"],
      model: settings.aiModel,
      apiKey: settings.aiApiKey,
      baseUrl: settings.aiBaseUrl ?? undefined,
    };

    const model = createAIProvider(aiConfig);
    const prompt = buildPersonaAnalysisPrompt(sampleTexts);

    const { text } = await generateText({
      model,
      prompt,
      maxTokens: 1000,
    });

    let result: PersonaAnalysisResult;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return c.json({ error: "Failed to parse AI response" }, 500);
    }

    const systemPromptFragment = compilePersonaFragment({
      name: "新建人设",
      description: result.description,
      styleTags: result.styleTags,
      toneWords: result.toneWords,
      hardRules: result.suggestedRules,
      bannedWords: result.suggestedBannedWords,
      extractedPatterns: result.extractedPatterns,
    });

    return c.json({ ...result, systemPromptFragment });
  });
