import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import {
  chapters,
  characters,
  foreshadowings,
  personas,
  projects,
  userSettings,
} from "../db/schema.js";
import type { BookContext } from "./ai/prompts.js";
import type { AIProviderConfig } from "@vibewriting/shared";

export async function getBookContext(
  chapterId: string,
  userId: string
): Promise<BookContext & { aiConfig: AIProviderConfig | null }> {
  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.id, chapterId),
  });
  if (!chapter) throw new Error("Chapter not found");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, chapter.projectId),
  });
  if (!project || project.userId !== userId) throw new Error("Project not found");

  const [characterList, foreshadowingList, settings] = await Promise.all([
    db.query.characters.findMany({
      where: eq(characters.projectId, project.id),
    }),
    db.query.foreshadowings.findMany({
      where: eq(foreshadowings.projectId, project.id),
    }),
    db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    }),
  ]);

  let persona = undefined;
  if (project.personaId) {
    persona = await db.query.personas.findFirst({
      where: eq(personas.id, project.personaId),
    }) ?? undefined;
  }

  const recentChapters = await db.query.chapters.findMany({
    where: eq(chapters.projectId, project.id),
    orderBy: (c, { desc }) => [desc(c.order)],
    limit: 5,
  });

  const recentSummaries = recentChapters
    .filter((c) => c.id !== chapterId && c.summary)
    .map((c) => `第${c.order}章《${c.title}》：${c.summary}`)
    .reverse();

  const aiConfig: AIProviderConfig | null = settings
    ? {
        provider: settings.aiProvider as AIProviderConfig["provider"],
        model: settings.aiModel,
        apiKey: settings.aiApiKey ?? "",
        baseUrl: settings.aiBaseUrl ?? undefined,
      }
    : null;

  return {
    project: {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    } as any,
    persona: persona
      ? {
          ...persona,
          styleTags: (persona.styleTags as string[]) ?? [],
          toneWords: (persona.toneWords as string[]) ?? [],
          hardRules: (persona.hardRules as string[]) ?? [],
          bannedWords: (persona.bannedWords as string[]) ?? [],
          sampleTexts: (persona.sampleTexts as string[]) ?? [],
          createdAt: persona.createdAt.toISOString(),
          updatedAt: persona.updatedAt.toISOString(),
        } as any
      : undefined,
    characters: characterList.map((c) => ({
      ...c,
      behaviorRules: (c.behaviorRules as string[]) ?? [],
      arcMilestones: (c.arcMilestones as any[]) ?? [],
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })) as any[],
    foreshadowings: foreshadowingList.map((f) => ({
      ...f,
      relatedCharacters: (f.relatedCharacters as string[]) ?? [],
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })) as any[],
    recentChapterSummaries: recentSummaries,
    aiConfig,
  };
}
