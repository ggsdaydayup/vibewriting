import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  PanelLeft,
  MessageSquare,
  Zap,
  PenLine,
  ChevronDown,
  X,
} from "lucide-react";
import { WritingEditor } from "../../components/editor/WritingEditor";
import { ChapterTree } from "../../components/sidebar/ChapterTree";
import { AssistantPanel } from "../../components/context-panel/AssistantPanel";
import { AutopilotModal } from "../../components/editor/AutopilotModal";
import { api } from "../../lib/api/client";
import { useEditorStore } from "../../lib/store/editor";
import { Button } from "../../components/ui/Button";
import type { Chapter, Project, Persona } from "@vibewriting/shared";

export function WritePage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const {
    showChapterTree,
    showAssistant,
    toggleChapterTree,
    toggleAssistant,
    setChapter,
    setProject,
    setPersona,
    isGenerating,
  } = useEditorStore();

  const [chapter, setLocalChapter] = useState<Chapter | null>(null);
  const [project, setLocalProject] = useState<Project | null>(null);
  const [showAutopilot, setShowAutopilot] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);

    api.get<Chapter>(`/chapters/${chapterId}`)
      .then(async (ch) => {
        setLocalChapter(ch);
        setChapter(ch);

        const proj = await api.get<Project>(`/projects/${ch.projectId}`);
        setLocalProject(proj);
        setProject(proj);

        if (proj.personaId) {
          const persona = await api.get<Persona>(`/personas/${proj.personaId}`);
          setPersona(persona);
        }
      })
      .finally(() => setLoading(false));
  }, [chapterId]);

  function handleSave(content: string) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      if (!chapterId) return;
      const updated = await api.patch<Chapter>(`/chapters/${chapterId}`, { content });
      setLocalChapter(updated);
    }, 2000);
  }

  if (!chapterId) return null;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">
        加载中...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 顶栏 */}
      <header className="h-10 border-b border-[hsl(var(--border))] flex items-center px-3 gap-3 shrink-0">
        <Link to={project ? `/project/${project.id}` : "/dashboard"}>
          <PenLine className="w-4 h-4 text-purple-400" />
        </Link>

        {project && (
          <>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">
              {project.title}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">/</span>
          </>
        )}

        <span className="text-xs truncate max-w-48">
          {chapter?.title ?? ""}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isGenerating && (
            <span className="text-xs text-purple-400 animate-pulse mr-2">
              AI 生成中...
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAutopilot(true)}
            title="自动驾驶 - AI 全自动写本章"
          >
            <Zap className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleChapterTree}
            className={showChapterTree ? "text-purple-400" : ""}
            title="章节树"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAssistant}
            className={showAssistant ? "text-purple-400" : ""}
            title="写作助手"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* 主体区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧章节树 */}
        {showChapterTree && project && (
          <div className="w-56 border-r border-[hsl(var(--border))] shrink-0 flex flex-col overflow-hidden">
            <ChapterTree
              projectId={project.id}
              onClose={toggleChapterTree}
            />
          </div>
        )}

        {/* 写作区 */}
        <div className="flex-1 overflow-hidden">
          <WritingEditor
            chapterId={chapterId}
            initialContent={chapter?.content ?? ""}
            onSave={handleSave}
          />
        </div>

        {/* 右侧助手 */}
        {showAssistant && (
          <div className="w-72 border-l border-[hsl(var(--border))] shrink-0 overflow-hidden">
            <AssistantPanel chapterId={chapterId} />
          </div>
        )}
      </div>

      {/* 底栏 */}
      <footer className="h-6 border-t border-[hsl(var(--border))] flex items-center px-4 gap-4 shrink-0">
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          {chapter?.wordCount ?? 0} 字
        </span>
        <span className="text-xs text-[hsl(var(--muted-foreground))]">
          Tab 接受补全 · Cmd+K 改写 · Esc 取消
        </span>
      </footer>

      {/* 自动驾驶弹窗 */}
      {showAutopilot && chapterId && (
        <AutopilotModal
          chapterId={chapterId}
          onClose={() => setShowAutopilot(false)}
          onGenerated={(content) => {
            setLocalChapter((prev) => prev ? { ...prev, content } : null);
            setShowAutopilot(false);
          }}
        />
      )}
    </div>
  );
}
