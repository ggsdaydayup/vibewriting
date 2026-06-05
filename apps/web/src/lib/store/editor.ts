import { create } from "zustand";
import type { Chapter, Project, Persona } from "@vibewriting/shared";

interface EditorState {
  project: Project | null;
  chapter: Chapter | null;
  persona: Persona | null;
  ghostText: string;
  isGenerating: boolean;
  showAssistant: boolean;
  showChapterTree: boolean;
  setProject: (project: Project | null) => void;
  setChapter: (chapter: Chapter | null) => void;
  setPersona: (persona: Persona | null) => void;
  setGhostText: (text: string) => void;
  setIsGenerating: (generating: boolean) => void;
  toggleAssistant: () => void;
  toggleChapterTree: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  project: null,
  chapter: null,
  persona: null,
  ghostText: "",
  isGenerating: false,
  showAssistant: false,
  showChapterTree: false,
  setProject: (project) => set({ project }),
  setChapter: (chapter) => set({ chapter }),
  setPersona: (persona) => set({ persona }),
  setGhostText: (text) => set({ ghostText: text }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  toggleAssistant: () =>
    set((s) => ({ showAssistant: !s.showAssistant })),
  toggleChapterTree: () =>
    set((s) => ({ showChapterTree: !s.showChapterTree })),
}));
