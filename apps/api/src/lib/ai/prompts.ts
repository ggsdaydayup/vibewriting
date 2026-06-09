import type { Chapter, Character, Foreshadowing, Persona, Project } from "@vibewriting/shared";
import type { FourLayerContext } from "../context.js";

export interface BookContext {
  project: Project;
  persona?: Persona;
  characters?: Character[];
  foreshadowings?: Foreshadowing[];
  recentChapterSummaries?: string[];
  fourLayerContext?: FourLayerContext;
}

// ─────────────────────────────────────────────
//  四层记忆 System Prompt 构建器
// ─────────────────────────────────────────────

export function buildFourLayerSystemPrompt(ctx: FourLayerContext): string {
  const parts: string[] = [];

  parts.push("你是专业的长篇小说写作助手。");
  parts.push("严格遵守下方 Persona 的风格要求。输出纯正文，禁止任何解释性文字。\n");

  // ── Layer 1: 永久全局状态 ──────────────────────
  parts.push("═══════════════════════════════");
  parts.push("【第一层：全局状态 — 永久有效】");
  parts.push("═══════════════════════════════\n");

  if (ctx.globalState.persona?.systemPromptFragment) {
    parts.push("▌ 写作人设（Persona）");
    parts.push(ctx.globalState.persona.systemPromptFragment);
    parts.push("");
  }

  if (ctx.globalState.project.coreTheme) {
    parts.push("▌ 核心主旨（每一章都必须服务于它）");
    parts.push(ctx.globalState.project.coreTheme);
    parts.push("");
  }

  if (ctx.globalState.project.genre) {
    parts.push(`▌ 作品类型：${ctx.globalState.project.genre}\n`);
  }

  if (ctx.globalState.characters.length > 0) {
    parts.push("▌ 人物卡片");
    for (const c of ctx.globalState.characters) {
      const role = c.role === "protagonist" ? "主角" : c.role === "antagonist" ? "反派" : "配角";
      parts.push(`\n【${c.name}】（${role}）`);
      if (c.description) parts.push(`  人设：${c.description}`);
      if (c.currentState) parts.push(`  当前状态：${c.currentState}`);
      if (c.endState) parts.push(`  人物弧光终点：${c.endState}`);
      if (c.behaviorRules.length > 0) {
        parts.push(`  行为规则：${c.behaviorRules.join("；")}`);
      }
      if (c.arcMilestones.length > 0) {
        const reached = c.arcMilestones.filter((m) => m.reached).map((m) => m.description);
        const pending = c.arcMilestones.filter((m) => !m.reached).map((m) => m.description);
        if (reached.length > 0) parts.push(`  已完成里程碑：${reached.join("、")}`);
        if (pending.length > 0) parts.push(`  待完成里程碑：${pending.join("、")}`);
      }
      if (c.relationships && Object.keys(c.relationships).length > 0) {
        const relStr = Object.entries(c.relationships)
          .map(([name, rel]) => `${name}（${rel}）`)
          .join("、");
        parts.push(`  人物关系：${relStr}`);
      }
    }
    parts.push("");
  }

  if (ctx.globalState.worldNotes.length > 0) {
    parts.push("▌ 世界观设定");
    const byCategory = ctx.globalState.worldNotes.reduce<Record<string, typeof ctx.globalState.worldNotes>>(
      (acc, w) => {
        (acc[w.category] = acc[w.category] || []).push(w);
        return acc;
      },
      {}
    );
    for (const [cat, notes] of Object.entries(byCategory)) {
      parts.push(`\n[${cat}]`);
      for (const n of notes) {
        parts.push(`  · ${n.title}：${n.content}`);
      }
    }
    parts.push("");
  }

  const pendingForeshadowings = ctx.globalState.foreshadowings.filter(
    (f) => f.status === "planted" || f.status === "due_soon"
  );
  if (pendingForeshadowings.length > 0) {
    parts.push("▌ 待回收伏笔（请在适当时机埋下线索或回收）");
    for (const f of pendingForeshadowings) {
      const dueSoon = f.plannedCollection && f.plannedCollection <= ctx.currentChapter.order + 3;
      const urgency = f.status === "due_soon" || dueSoon ? "【⚠ 即将到期】" : "";
      parts.push(
        `  ${urgency}[第${f.plantedChapter}章埋下${f.plannedCollection ? `→计划第${f.plannedCollection}章回收` : ""}] ${f.description}`
      );
    }
    parts.push("");
  }

  // ── Layer 2: 故事结构层 ──────────────────────
  parts.push("═══════════════════════════════");
  parts.push("【第二层：故事结构 — 全局节奏感知】");
  parts.push("═══════════════════════════════\n");

  const totalWords = ctx.storyStructure.reduce((s, c) => s + c.wordCount, 0);
  const completedChapters = ctx.storyStructure.filter((c) => c.status === "completed").length;
  const totalChapters = ctx.storyStructure.length;
  const progress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

  parts.push(
    `全书进度：第${ctx.currentChapter.order}章 / 共${totalChapters}章（${progress}%），累计约${totalWords}字`
  );

  // 展示最近 3 章 + 当前章 + 接下来 2 章的结构概览
  const structureWindow = ctx.storyStructure.filter(
    (c) =>
      c.order >= ctx.currentChapter.order - 3 && c.order <= ctx.currentChapter.order + 2
  );
  if (structureWindow.length > 0) {
    parts.push("\n章节结构（当前窗口）：");
    for (const c of structureWindow) {
      const marker =
        c.order === ctx.currentChapter.order
          ? "▶ [当前]"
          : c.order < ctx.currentChapter.order
          ? "  ✓"
          : "  …";
      parts.push(`  ${marker} 第${c.order}章《${c.title}》（${c.wordCount}字）`);
    }
  }
  parts.push("");

  // ── Layer 3: 章节记忆层 ──────────────────────
  if (ctx.chapterMemory.length > 0) {
    parts.push("═══════════════════════════════");
    parts.push("【第三层：章节记忆 — 近期剧情连贯性】");
    parts.push("═══════════════════════════════\n");

    for (const mem of ctx.chapterMemory) {
      parts.push(`第${mem.order}章《${mem.title}》`);
      parts.push(`  摘要：${mem.summary}`);
      if (mem.endSnapshot) {
        const snap = mem.endSnapshot as any;
        if (snap.emotion) parts.push(`  结尾情绪：${snap.emotion}`);
        if (snap.cliffhanger) parts.push(`  悬念断点：${snap.cliffhanger}`);
        if (snap.characterStates) parts.push(`  人物状态：${snap.characterStates}`);
      }
      parts.push("");
    }
  }

  // ── Layer 4: 当前写作上下文（标头，正文由调用方补充）──
  parts.push("═══════════════════════════════");
  parts.push(`【第四层：当前章节 — 第${ctx.currentChapter.order}章《${ctx.currentChapter.title}》】`);
  parts.push("═══════════════════════════════\n");

  if (ctx.currentChapter.vibePrompt) {
    parts.push(`本章氛围/提示词：${ctx.currentChapter.vibePrompt}\n`);
  }

  return parts.join("\n");
}

// ─────────────────────────────────────────────
//  兼容旧版 buildSystemPrompt（逐步迁移）
// ─────────────────────────────────────────────

export function buildSystemPrompt(ctx: BookContext): string {
  if (ctx.fourLayerContext) {
    return buildFourLayerSystemPrompt(ctx.fourLayerContext);
  }

  const parts: string[] = [];
  parts.push("你是一个专业的写作助手，辅助用户进行创意写作。");
  parts.push("请严格按照用户的写作风格（Persona）进行创作，不要偏离。");
  parts.push("所有输出必须是纯粹的正文，不要添加任何解释或说明。\n");

  if (ctx.persona?.systemPromptFragment) {
    parts.push("## 写作人设（Persona）");
    parts.push(ctx.persona.systemPromptFragment);
    parts.push("");
  }

  if (ctx.project.coreTheme) {
    parts.push("## 作品核心主旨");
    parts.push(ctx.project.coreTheme);
    parts.push("每一段文字都应服务于这个主旨。\n");
  }

  if (ctx.characters && ctx.characters.length > 0) {
    parts.push("## 当前人物状态");
    for (const char of ctx.characters) {
      parts.push(`- ${char.name}（${char.role}）：${char.currentState || char.description || "无描述"}`);
      if ((char.behaviorRules as string[]).length > 0) {
        parts.push(`  行为规则：${(char.behaviorRules as string[]).join("；")}`);
      }
    }
    parts.push("");
  }

  if (ctx.foreshadowings && ctx.foreshadowings.length > 0) {
    const due = ctx.foreshadowings.filter(
      (f) => f.status === "planted" || f.status === "due_soon"
    );
    if (due.length > 0) {
      parts.push("## 待回收伏笔");
      for (const f of due) {
        parts.push(`- [第${f.plantedChapter}章埋下] ${f.description}`);
      }
      parts.push("");
    }
  }

  if (ctx.recentChapterSummaries && ctx.recentChapterSummaries.length > 0) {
    parts.push("## 近期章节摘要");
    parts.push(ctx.recentChapterSummaries.join("\n"));
    parts.push("");
  }

  return parts.join("\n");
}

// ─────────────────────────────────────────────
//  写作动作 Prompts
// ─────────────────────────────────────────────

export function buildCompletionPrompt(
  recentText: string,
  systemPrompt: string
): { system: string; prompt: string } {
  return {
    system: systemPrompt,
    prompt: `以下是当前正在写的内容，请续写接下来的1-3句话，保持风格一致，不要重复已有内容：\n\n${recentText}`,
  };
}

export function buildInlineEditPrompt(
  selectedText: string,
  instruction: string,
  context: string,
  systemPrompt: string
): { system: string; prompt: string } {
  return {
    system: systemPrompt,
    prompt: `请根据指令改写以下文字。只输出改写后的文字，不要任何解释。

指令：${instruction}

上下文参考（不要改写这部分）：
${context}

需要改写的文字：
${selectedText}`,
  };
}

export function buildOutlinePrompt(
  chapter: { order: number; title: string; vibePrompt?: string | null },
  ctx: FourLayerContext
): { system: string; prompt: string } {
  const system = buildFourLayerSystemPrompt(ctx);
  return {
    system,
    prompt: `请为第${chapter.order}章《${chapter.title}》生成一份详细的章节大纲。

大纲要求：
1. 分为3-5个场景/段落
2. 每个场景说明：发生了什么、推进了什么情节、涉及哪些人物
3. 标注本章的情绪弧线（如：紧张→释放→悬念）
4. 说明本章如何呼应核心主旨
5. 如果有待回收的伏笔，标注在哪个场景回收

请以如下 JSON 格式输出：
{
  "emotionArc": "本章情绪弧线描述",
  "themeConnection": "与核心主旨的关联",
  "scenes": [
    {
      "index": 1,
      "title": "场景小标题",
      "description": "场景详细描述",
      "characters": ["涉及人物"],
      "purpose": "推进目的（情节/人物/铺垫/回收伏笔等）",
      "foreshadowingAction": "可选：埋下或回收的伏笔说明"
    }
  ],
  "endingHook": "本章结尾钩子/悬念设计"
}`,
  };
}

export function buildAutopilotPrompt(
  chapter: Chapter,
  vibePrompt: string | undefined,
  systemPrompt: string,
  prevSnapshot?: string,
  approvedOutline?: string
): { system: string; prompt: string } {
  const parts: string[] = [];

  parts.push(`请完整写出《${chapter.title}》的正文。`);

  if (approvedOutline) {
    parts.push(`\n已确认的章节大纲：\n${approvedOutline}`);
    parts.push("\n请严格按照大纲的场景顺序和情节逻辑展开正文。");
  }

  if (vibePrompt) {
    parts.push(`\n本章氛围要求：${vibePrompt}`);
  }

  if (prevSnapshot) {
    parts.push(`\n上一章结尾状态：${prevSnapshot}`);
  }

  if (chapter.vibePrompt && chapter.vibePrompt !== vibePrompt) {
    parts.push(`\n章节提示：${chapter.vibePrompt}`);
  }

  parts.push("\n请直接输出正文，不要标题，不要任何说明，字数不少于2000字。");

  return {
    system: systemPrompt,
    prompt: parts.join(""),
  };
}

export function buildChapterSummaryPrompt(
  chapterTitle: string,
  chapterOrder: number,
  content: string
): string {
  return `请为以下小说章节生成一份简洁的摘要，以及章节结尾状态快照。

章节信息：第${chapterOrder}章《${chapterTitle}》

章节正文：
${content.slice(0, 6000)}${content.length > 6000 ? "\n[...正文过长，已截断]" : ""}

请以 JSON 格式输出（只输出 JSON，不要任何解释）：
{
  "summary": "100-200字的剧情摘要，包含主要事件、人物动态、重要转折",
  "endSnapshot": {
    "emotion": "章节结尾的情绪氛围（如：紧张、温情、悬疑、热血等）",
    "cliffhanger": "章节结尾的悬念或钩子（如果有）",
    "characterStates": "主要人物在本章结尾时的状态变化摘要",
    "plotAdvance": "本章推进了哪些主要剧情线"
  }
}`;
}

export function buildConsistencyCheckPrompt(
  chapter: { order: number; title: string; vibePrompt?: string | null },
  ctx: FourLayerContext
): string {
  const recentMemory = ctx.chapterMemory
    .slice(-3)
    .map((c) => `第${c.order}章：${c.summary}`)
    .join("\n");

  return `你是一个长篇小说一致性检查专家。请检查以下内容，找出潜在的逻辑矛盾或一致性问题。

当前准备写：第${chapter.order}章《${chapter.title}》
章节提示：${chapter.vibePrompt || "（无）"}

近期剧情摘要：
${recentMemory || "（无已完成章节）"}

人物当前状态：
${ctx.globalState.characters
  .map((c) => `- ${c.name}：${c.currentState || c.description || "未知"}`)
  .join("\n")}

待回收伏笔：
${
  ctx.globalState.foreshadowings
    .filter((f) => f.status === "planted" || f.status === "due_soon")
    .map((f) => `- 第${f.plantedChapter}章埋下：${f.description}`)
    .join("\n") || "（无）"
}

请以 JSON 格式输出（只输出 JSON）：
{
  "issues": [
    {
      "severity": "warning | info",
      "type": "character_state | plot_continuity | foreshadowing | world_setting | other",
      "description": "具体问题描述",
      "suggestion": "建议的处理方式"
    }
  ],
  "reminders": ["本章应注意事项（如即将到期的伏笔、人物弧光进展等）"],
  "overallStatus": "clean | needs_attention | has_conflicts"
}`;
}

export function buildPersonaAnalysisPrompt(sampleTexts: string[]): string {
  return `请分析以下写作样本，提取作者的写作风格特征。以 JSON 格式输出，包含以下字段：
{
  "description": "一句话描述整体风格",
  "styleTags": ["风格标签数组，最多5个"],
  "toneWords": ["情绪/基调词数组，最多4个"],
  "extractedPatterns": {
    "avgSentenceLength": 平均句子字数（数字）,
    "punctuationStyle": "标点使用特点描述",
    "vocabularyLevel": "词汇层次描述",
    "imageryTypes": ["意象类型数组"],
    "syntaxPatterns": ["句式特点数组"]
  },
  "suggestedRules": ["建议的硬性写作规则，最多5条"],
  "suggestedBannedWords": ["建议禁用的词语，最多10个"]
}

写作样本：
${sampleTexts.map((t, i) => `--- 样本${i + 1} ---\n${t}`).join("\n\n")}`;
}

export function compilePersonaFragment(persona: {
  name: string;
  description?: string;
  styleTags: string[];
  toneWords: string[];
  hardRules: string[];
  bannedWords: string[];
  extractedPatterns?: {
    avgSentenceLength?: number;
    punctuationStyle?: string;
    vocabularyLevel?: string;
    imageryTypes?: string[];
    syntaxPatterns?: string[];
  };
}): string {
  const lines: string[] = [];

  lines.push(`写作人设名称：${persona.name}`);

  if (persona.description) {
    lines.push(`核心气质：${persona.description}`);
  }

  if (persona.styleTags.length > 0) {
    lines.push(`风格标签：${persona.styleTags.join("、")}`);
  }

  if (persona.toneWords.length > 0) {
    lines.push(`情绪基调：${persona.toneWords.join("、")}`);
  }

  if (persona.extractedPatterns) {
    const p = persona.extractedPatterns;
    if (p.avgSentenceLength) {
      lines.push(`句式特点：平均 ${p.avgSentenceLength} 字/句`);
    }
    if (p.punctuationStyle) {
      lines.push(`标点习惯：${p.punctuationStyle}`);
    }
    if (p.imageryTypes && p.imageryTypes.length > 0) {
      lines.push(`意象偏好：${p.imageryTypes.join("、")}`);
    }
    if (p.syntaxPatterns && p.syntaxPatterns.length > 0) {
      lines.push(`句式模式：${p.syntaxPatterns.join("；")}`);
    }
  }

  if (persona.hardRules.length > 0) {
    lines.push(`硬性规则：\n${persona.hardRules.map((r) => `  - ${r}`).join("\n")}`);
  }

  if (persona.bannedWords.length > 0) {
    lines.push(`严格禁止出现的词语：${persona.bannedWords.join("、")}`);
  }

  return lines.join("\n");
}
