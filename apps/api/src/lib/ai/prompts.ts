import type { Chapter, Character, Foreshadowing, Persona, Project } from "@vibewriting/shared";

export interface BookContext {
  project: Project;
  persona?: Persona;
  characters?: Character[];
  foreshadowings?: Foreshadowing[];
  recentChapterSummaries?: string[];
}

export function buildSystemPrompt(ctx: BookContext): string {
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
      parts.push(
        `- ${char.name}（${char.role}）：${char.currentState || char.description || "无描述"}`
      );
      if (char.behaviorRules.length > 0) {
        parts.push(`  行为规则：${char.behaviorRules.join("；")}`);
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

export function buildAutopilotPrompt(
  chapter: Chapter,
  vibePrompt: string | undefined,
  systemPrompt: string,
  prevSnapshot?: string
): { system: string; prompt: string } {
  const parts: string[] = [];

  parts.push(`请完整写出《${chapter.title}》的正文。`);

  if (vibePrompt) {
    parts.push(`\n本章氛围要求：${vibePrompt}`);
  }

  if (prevSnapshot) {
    parts.push(`\n上一章结尾状态：${prevSnapshot}`);
  }

  if (chapter.vibePrompt) {
    parts.push(`\n章节提示：${chapter.vibePrompt}`);
  }

  parts.push("\n请直接输出正文，不要标题，不要任何说明。");

  return {
    system: systemPrompt,
    prompt: parts.join(""),
  };
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
