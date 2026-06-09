import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  PanelLeft,
  MessageSquare,
  Zap,
  PenLine,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { WritingEditor } from "../../components/editor/WritingEditor";
import { ChapterTree } from "../../components/sidebar/ChapterTree";
import { AssistantPanel } from "../../components/context-panel/AssistantPanel";
import { ForeshadowingTracker } from "../../components/context-panel/ForeshadowingTracker";
import { RhythmDashboard } from "../../components/context-panel/RhythmDashboard";
import { AutopilotModal } from "../../components/editor/AutopilotModal";
import { ConsistencyCheckCard } from "../../components/editor/ConsistencyCheckCard";
import { storageClient } from "../../lib/storage";
import { useEditorStore } from "../../lib/store/editor";
import { Button } from "../../components/ui/button";
import type { Chapter, Project, Persona } from "@vibewriting/shared";

type RightPanel = "assistant" | "foreshadowing" | "rhythm" | null;

export function WritePage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const {
    showChapterTree,
    toggleChapterTree,
    setChapter,
    setProject,
    setPersona,
    isGenerating,
  } = useEditorStore();

  const [chapter, setLocalChapter] = useState<Chapter | null>(null);
  const [project, setLocalProject] = useState<Project | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [rightPanel, setRightPanel] = useState<RightPanel>("assistant");
  const [showAutopilot, setShowAutopilot] = useState(false);
  const [showConsistencyCheck, setShowConsistencyCheck] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevChapterId = useRef<string | null>(null);

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await storageClient.get(`/chapters/${id}`);
      const ch = await res.json<Chapter>();
      setLocalChapter(ch);
      setChapter(ch);

      const projRes = await storageClient.get(`/projects/${ch.projectId}`);
      const proj = await projRes.json<Project>();
      setLocalProject(proj);
      setProject(proj);

      const chaptersRes = await storageClient.get(`/chapters?projectId=${ch.projectId}`);
      const chapters = await chaptersRes.json<Chapter[]>();
      setAllChapters(chapters);

      if (proj.personaId) {
        const personaRes = await storageClient.get(`/personas/${proj.personaId}`);
        const persona = await personaRes.json<Persona>();
        setPersona(persona);
      }
    } finally {
      setLoading(false);
    }
  }, [setChapter, setProject, setPersona]);

  useEffect(() => {
    if (!chapterId) return;
    // 切换章节时触发一致性检查
    if (prevChapterId.current !== chapterId) {
      prevChapterId.current = chapterId;
      setShowConsistencyCheck(true);
    }
    fetchData(chapterId);
  }, [chapterId, fetchData]);

  const handleSave = useCallback((content: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      if (!chapterId) return;
      const res = await storageClient.patch(`/chapters/${chapterId}`, { content });
      const updated = await res.json<Chapter>();
      setLocalChapter(updated);
      setAllChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, wordCount: updated.wordCount } : c))
      );
    }, 2000);
  }, [chapterId]);

  const handleAutopilotAccept = useCallback(async (content: string) => {
    if (!chapterId) return;
    setLocalChapter((prev) => (prev ? { ...prev, content } : null));
    setShowAutopilot(false);

    // 自动触发摘要生成
    await storageClient.post("/ai/summarize", { chapterId, content, force: true });
    fetchData(chapterId);
  }, [chapterId, fetchData]);

  const toggleRightPanel = (panel: RightPanel) => {
    setRightPanel((prev) => (prev === panel ? null : panel));
  };

  if (!chapterId) return null;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/30 text-sm">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#111]">
      {/* 顶栏 */}
      <header className="h-10 border-b border-white/8 flex items-center px-3 gap-3 shrink-0 bg-[#111]">
        <Link to={project ? `/project/${project.id}` : "/dashboard"} className="hover:opacity-70 transition-opacity">
          <PenLine className="w-4 h-4 text-purple-400" />
        </Link>

        {project && (
          <>
            <span className="text-xs text-white/30">{project.title}</span>
            <span className="text-xs text-white/20">/</span>
          </>
        )}

        <span className="text-xs text-white/60 truncate max-w-48">{chapter?.title ?? ""}</span>

        <div className="ml-auto flex items-center gap-1">
          {isGenerating && (
            <span className="text-xs text-purple-400 animate-pulse mr-2">AI 生成中…</span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAutopilot(true)}
            title="自动驾驶 — AI 全自动写本章"
            className="text-white/40 hover:text-amber-400"
          >
            <Zap className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsistencyCheck(true)}
            title="一致性检查"
            className="text-white/40 hover:text-green-400"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleChapterTree}
            className={showChapterTree ? "text-purple-400" : "text-white/40"}
            title="章节树"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </Button>

          {/* Right panel toggles */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRightPanel("assistant")}
            className={rightPanel === "assistant" ? "text-purple-400" : "text-white/40"}
            title="写作助手"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRightPanel("foreshadowing")}
            className={rightPanel === "foreshadowing" ? "text-amber-400" : "text-white/40"}
            title="伏笔追踪器"
          >
            <Zap className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRightPanel("rhythm")}
            className={rightPanel === "rhythm" ? "text-blue-400" : "text-white/40"}
            title="节奏仪表盘"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧章节树 */}
        {showChapterTree && project && (
          <div className="w-56 border-r border-white/8 shrink-0 flex flex-col overflow-hidden bg-[#111]">
            <ChapterTree projectId={project.id} onClose={toggleChapterTree} />
          </div>
        )}

        {/* 写作区 — 包含一致性预检卡 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {showConsistencyCheck && chapterId && (
            <ConsistencyCheckCard
              chapterId={chapterId}
              onDismiss={() => setShowConsistencyCheck(false)}
            />
          )}
          <div className="flex-1 overflow-hidden">
            <WritingEditor
              chapterId={chapterId}
              initialContent={chapter?.content ?? ""}
              onSave={handleSave}
            />
          </div>
        </div>

        {/* 右侧面板 */}
        {rightPanel && (
          <div className="w-72 border-l border-white/8 shrink-0 overflow-hidden flex flex-col bg-[#111]">
            {rightPanel === "assistant" && <AssistantPanel chapterId={chapterId} />}
            {rightPanel === "foreshadowing" && project && (
              <ForeshadowingTracker
                projectId={project.id}
                currentChapterOrder={chapter?.order}
                totalChapters={allChapters.length}
              />
            )}
            {rightPanel === "rhythm" && (
              <div className="overflow-y-auto">
                <RhythmDashboard
                  chapters={allChapters}
                  currentChapterId={chapterId}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底栏 */}
      <footer className="h-6 border-t border-white/8 flex items-center px-4 gap-4 shrink-0 bg-[#111]">
        <span className="text-xs text-white/25">{chapter?.wordCount ?? 0} 字</span>
        <span className="text-xs text-white/20">Tab 接受补全 · Cmd+K 改写 · Esc 取消</span>
      </footer>

      {/* 自动驾驶弹窗 */}
      {showAutopilot && chapterId && chapter && (
        <AutopilotModal
          chapterId={chapterId}
          chapterTitle={chapter.title}
          onAccept={handleAutopilotAccept}
          onClose={() => setShowAutopilot(false)}
        />
      )}
    </div>
  );
}
