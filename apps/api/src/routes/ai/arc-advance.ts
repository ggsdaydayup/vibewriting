import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { characters, chapters, projects, userSettings } from "../../db/schema.js";
import { createAIProvider } from "../../lib/ai/providers.js";
import { authMiddleware } from "../../middleware/auth.js";
import type { AIProviderConfig } from "@vibewriting/shared";

const router = new Hono<{ Variables: { userId: string } }>();
router.use(authMiddleware);

const bodySchema = z.object({
  chapterId: z.string().uuid(),
  content: z.string().min(100),
});

/**
 * POST /api/ai/arc-advance
 *
 * 角色弧光自动推进：
 * 分析章节内容 → 识别人物状态变化 → 更新 character.currentState 和 arcMilestones
 * 通常在章节标记为 completed 后触发
 */
router.post("/", zValidator("json", bodySchema), async (c) => {
  const userId = c.get("userId") as string;
  const { chapterId, content } = c.req.valid("json");

  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.id, chapterId),
  });
  if (!chapter) return c.json({ error: "Chapter not found" }, 404);

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, chapter.projectId),
  });
  if (!project || project.userId !== userId) return c.json({ error: "Project not found" }, 404);

  const [characterList, settings] = await Promise.all([
    db.query.characters.findMany({ where: eq(characters.projectId, project.id) }),
    db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) }),
  ]);

  if (!characterList.length) return c.json({ updates: [] });
  if (!settings?.aiApiKey) return c.json({ error: "AI API key not configured" }, 400);

  const aiConfig: AIProviderConfig = {
    provider: settings.aiProvider as AIProviderConfig["provider"],
    model: settings.aiModel,
    apiKey: settings.aiApiKey!,
    baseUrl: settings.aiBaseUrl ?? undefined,
  };

  const charSummary = characterList
    .map(
      (c) =>
        `- ${c.name}（当前状态：${c.currentState || "未知"}）\n  待完成里程碑：${
          ((c.arcMilestones as any[]) ?? [])
            .filter((m) => !m.reached)
            .map((m) => m.description)
            .join("；") || "无"
        }`
    )
    .join("\n");

  const prompt = `请分析以下小说章节，判断各人物在本章的状态变化，并识别是否完成了任何人物弧光里程碑。

当前人物状态：
${charSummary}

第${chapter.order}章《${chapter.title}》正文（前3000字）：
${content.slice(0, 3000)}

请以 JSON 格式输出（只输出 JSON，不要解释）：
{
  "updates": [
    {
      "characterName": "人物名",
      "newCurrentState": "本章结束时该人物的新状态描述（如果有变化）",
      "reachedMilestones": ["本章达成的里程碑描述（与原文完全匹配）"],
      "stateChanged": true
    }
  ]
}

注意：只列出状态有实质变化的人物，没有变化的不要列入。`;

  const model = createAIProvider(aiConfig);
  const { text } = await generateText({ model, prompt, maxTokens: 600 });

  let updates: Array<{
    characterName: string;
    newCurrentState?: string;
    reachedMilestones?: string[];
    stateChanged: boolean;
  }> = [];

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      updates = parsed.updates ?? [];
    }
  } catch {
    return c.json({ updates: [] });
  }

  // 写回数据库
  const applied: string[] = [];
  for (const update of updates) {
    if (!update.stateChanged) continue;
    const char = characterList.find((c) => c.name === update.characterName);
    if (!char) continue;

    const milestones = (char.arcMilestones as Array<{ description: string; reached?: boolean; reachedAt?: number }>) ?? [];
    const updatedMilestones = milestones.map((m) => ({
      ...m,
      reached: m.reached || (update.reachedMilestones ?? []).includes(m.description),
      reachedAt:
        !m.reached && (update.reachedMilestones ?? []).includes(m.description)
          ? chapter.order
          : m.reachedAt,
    }));

    await db
      .update(characters)
      .set({
        currentState: update.newCurrentState || char.currentState,
        arcMilestones: updatedMilestones,
        updatedAt: new Date(),
      })
      .where(eq(characters.id, char.id));

    applied.push(update.characterName);
  }

  return c.json({ updates, applied });
});

export default router;
