export type ChapterStatus = "draft" | "outline" | "completed";

export interface ChapterEndSnapshot {
  emotionalTone: string;
  infoBreakpoint: string;
  hookType?: string;
  lastScene?: string;
  unresolved?: string[];
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  order: number;
  status: ChapterStatus;
  content?: string;
  summary?: string;
  vibePrompt?: string;
  wordCount: number;
  endSnapshot?: ChapterEndSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChapterInput {
  projectId: string;
  title: string;
  order: number;
}

export interface UpdateChapterInput {
  title?: string;
  content?: string;
  summary?: string;
  status?: ChapterStatus;
  vibePrompt?: string;
  endSnapshot?: ChapterEndSnapshot;
}
