import { db } from "../db/index.js";
import { eq, and, ne, lte, gt } from "drizzle-orm";
import {
  chapters,
  characters,
  foreshadowings,
  personas,
  projects,
  userSettings,
  worldNotes,
} from "../db/schema.js";
import type { BookContext } from "./ai/prompts.js";
import type { AIProviderConfig } from "@vibewriting/shared";

/**
 * 四层记忆架构：
 *
 * Layer 1 — 永久全局状态
 *   世界观条目、人物卡片（含当前状态）、核心主旨、待回收伏笔列表
 *
 * Layer 2 — 故事结构层
 *   全书章节列表（序号+标题+状态+字数），用于感知全局节奏
 *
 * Layer 3 — 章节记忆层
 *   已完成章节的摘要（向前取 N 章），chapter.endSnapshot（上章结尾情绪/状态断点）
 *
 * Layer 4 — 当前写作上下文
 *   当前章节标题、vibePrompt、正文片段（由调用方传入）
 */

export interface FourLayerContext {
  /** Layer 1 */
  globalState: {
    project: {
      id: string;
      title: string;
      description: string | null;
      genre: string | null;
      coreTheme: string | null;
    };
    persona?: {
      name: string;
      description: string | null;
      systemPromptFragment: string;
      styleTags: string[];
      toneWords: string[];
      hardRules: string[];
      bannedWords: string[];
      extractedPatterns?: Record<string, unknown>;
    };
    characters: Array<{
      id: string;
      name: string;
      role: string;
      description: string | null;
      currentState: string | null;
      startState: string | null;
      endState: string | null;
      behaviorRules: string[];
      arcMilestones: Array<{ order: number; description: string; reached?: boolean }>;
      relationships?: Record<string, string>;
    }>;
    worldNotes: Array<{
      category: string;
      title: string;
      content: string;
    }>;
    foreshadowings: Array<{
      id: string;
      description: string;
      plantedChapter: number;
      plannedCollection: number | null;
      collectedChapter: number | null;
      status: string;
      relatedCharacters: string[];
    }>;
  };

  /** Layer 2 */
  storyStructure: Array<{
    order: number;
    title: string;
    status: string;
    wordCount: number;
    hasSummary: boolean;
  }>;

  /** Layer 3 */
  chapterMemory: Array<{
    order: number;
    title: string;
    summary: string;
    endSnapshot?: Record<string, unknown> | null;
  }>;

  /** Layer 4 — 由调用方补充 currentText */
  currentChapter: {
    id: string;
    order: number;
    title: string;
    vibePrompt: string | null;
    wordCount: number;
  };

  aiConfig: AIProviderConfig | null;
}

const MEMORY_WINDOW = 8; // 向前取多少章的摘要

export async function getFourLayerContext(
  chapterId: string,
  userId: string
): Promise<FourLayerContext> {
  const chapter = await db.query.chapters.findFirst({
    where: eq(chapters.id, chapterId),
  });
  if (!chapter) throw new Error("Chapter not found");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, chapter.projectId),
  });
  if (!project || project.userId !== userId) throw new Error("Project not found");

  const [characterList, foreshadowingList, worldNoteList, settings, allChapters] =
    await Promise.all([
      db.query.characters.findMany({
        where: eq(characters.projectId, project.id),
      }),
      db.query.foreshadowings.findMany({
        where: eq(foreshadowings.projectId, project.id),
      }),
      db.query.worldNotes.findMany({
        where: eq(worldNotes.projectId, project.id),
      }),
      db.query.userSettings.findFirst({
        where: eq(userSettings.userId, userId),
      }),
      db.query.chapters.findMany({
        where: eq(chapters.projectId, project.id),
        orderBy: (c, { asc }) => [asc(c.order)],
      }),
    ]);

  let persona = undefined;
  if (project.personaId) {
    persona =
      (await db.query.personas.findFirst({
        where: eq(personas.id, project.personaId),
      })) ?? undefined;
  }

  // Layer 3: 当前章节之前 MEMORY_WINDOW 章的摘要
  const precedingChapters = allChapters
    .filter((c) => c.order < chapter.order && c.summary)
    .slice(-MEMORY_WINDOW);

  const aiConfig: AIProviderConfig | null = settings
    ? {
        provider: settings.aiProvider as AIProviderConfig["provider"],
        model: settings.aiModel,
        apiKey: settings.aiApiKey ?? "",
        baseUrl: settings.aiBaseUrl ?? undefined,
      }
    : null;

  return {
    globalState: {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        genre: project.genre,
        coreTheme: project.coreTheme,
      },
      persona: persona
        ? {
            name: persona.name,
            description: persona.description,
            systemPromptFragment: persona.systemPromptFragment,
            styleTags: (persona.styleTags as string[]) ?? [],
            toneWords: (persona.toneWords as string[]) ?? [],
            hardRules: (persona.hardRules as string[]) ?? [],
            bannedWords: (persona.bannedWords as string[]) ?? [],
            extractedPatterns:
              (persona.extractedPatterns as Record<string, unknown>) ?? undefined,
          }
        : undefined,
      characters: characterList.map((c) => ({
        id: c.id,
        name: c.name,
        role: c.role,
        description: c.description,
        currentState: c.currentState,
        startState: c.startState,
        endState: c.endState,
        behaviorRules: (c.behaviorRules as string[]) ?? [],
        arcMilestones: (c.arcMilestones as any[]) ?? [],
        relationships: (c.relationships as Record<string, string>) ?? undefined,
      })),
      worldNotes: worldNoteList.map((w) => ({
        category: w.category,
        title: w.title,
        content: w.content,
      })),
      foreshadowings: foreshadowingList.map((f) => ({
        id: f.id,
        description: f.description,
        plantedChapter: f.plantedChapter,
        plannedCollection: f.plannedCollection,
        collectedChapter: f.collectedChapter,
        status: f.status,
        relatedCharacters: (f.relatedCharacters as string[]) ?? [],
      })),
    },
    storyStructure: allChapters.map((c) => ({
      order: c.order,
      title: c.title,
      status: c.status,
      wordCount: c.wordCount,
      hasSummary: !!c.summary,
    })),
    chapterMemory: precedingChapters.map((c) => ({
      order: c.order,
      title: c.title,
      summary: c.summary!,
      endSnapshot: c.endSnapshot as Record<string, unknown> | null,
    })),
    currentChapter: {
      id: chapter.id,
      order: chapter.order,
      title: chapter.title,
      vibePrompt: chapter.vibePrompt,
      wordCount: chapter.wordCount,
    },
    aiConfig,
  };
}

/** 向下兼容旧版 BookContext（供 prompts.ts 使用） */
export async function getBookContext(
  chapterId: string,
  userId: string
): Promise<BookContext & { aiConfig: AIProviderConfig | null }> {
  const ctx = await getFourLayerContext(chapterId, userId);

  return {
    project: {
      id: ctx.globalState.project.id,
      userId,
      title: ctx.globalState.project.title,
      description: ctx.globalState.project.description,
      genre: ctx.globalState.project.genre,
      coreTheme: ctx.globalState.project.coreTheme,
      personaId: null,
      coverUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any,
    persona: ctx.globalState.persona as any,
    characters: ctx.globalState.characters as any[],
    foreshadowings: ctx.globalState.foreshadowings as any[],
    recentChapterSummaries: ctx.chapterMemory.map(
      (c) => `第${c.order}章《${c.title}》：${c.summary}`
    ),
    aiConfig: ctx.aiConfig,
    fourLayerContext: ctx,
  };
}
