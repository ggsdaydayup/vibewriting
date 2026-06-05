import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  BookOpen, Plus, PenLine, Settings, Users, Globe, Bookmark,
  ChevronRight, ArrowLeft
} from "lucide-react";
import { api } from "../../lib/api/client";
import { Button } from "../../components/ui/Button";
import type { Project, Chapter, Character, Persona } from "@vibewriting/shared";

type Tab = "chapters" | "characters" | "world" | "foreshadowing";

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [tab, setTab] = useState<Tab>("chapters");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      api.get<Project>(`/projects/${projectId}`),
      api.get<Chapter[]>(`/chapters/project/${projectId}`),
      api.get<Character[]>(`/characters/project/${projectId}`),
    ]).then(async ([proj, chs, chars]) => {
      setProject(proj);
      setChapters(chs);
      setCharacters(chars);
      if (proj.personaId) {
        const p = await api.get<Persona>(`/personas/${proj.personaId}`);
        setPersona(p);
      }
    }).finally(() => setLoading(false));
  }, [projectId]);

  async function addChapter() {
    if (!projectId) return;
    const ch = await api.post<Chapter>("/chapters", {
      projectId,
      title: `第${chapters.length + 1}章`,
      order: chapters.length,
    });
    setChapters((prev) => [...prev, ch]);
    navigate(`/write/${ch.id}`);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">
      加载中...
    </div>
  );

  if (!project) return null;

  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  const completedChapters = chapters.filter(c => c.status === "completed").length;

  return (
    <div className="min-h-screen">
      <header className="border-b border-[hsl(var(--border))] px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <PenLine className="w-4 h-4 text-purple-400" />
        <span className="font-medium">{project.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* 项目信息 */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          {project.description && (
            <p className="text-[hsl(var(--muted-foreground))]">{project.description}</p>
          )}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              共 {chapters.length} 章 · {totalWords.toLocaleString()} 字 · {completedChapters} 章已完成
            </span>
            {persona && (
              <span className="text-sm text-purple-400 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" />
                {persona.name}
              </span>
            )}
          </div>
        </div>

        {/* 标签切换 */}
        <div className="flex items-center gap-1 border-b border-[hsl(var(--border))]">
          {(["chapters", "characters", "world", "foreshadowing"] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = {
              chapters: "章节",
              characters: "人物",
              world: "世界观",
              foreshadowing: "伏笔",
            };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
                  tab === t
                    ? "border-purple-500 text-purple-300"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {labels[t]}
              </button>
            );
          })}
        </div>

        {/* 章节列表 */}
        {tab === "chapters" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button onClick={addChapter} size="sm">
                <Plus className="w-3.5 h-3.5" />
                新增章节
              </Button>
            </div>
            {chapters.length === 0 ? (
              <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>还没有章节</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => navigate(`/write/${ch.id}`)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors group"
                  >
                    <span className="text-xs text-[hsl(var(--muted-foreground))] w-8 shrink-0">
                      {ch.order + 1}
                    </span>
                    <span className="flex-1">{ch.title}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {ch.wordCount > 0 ? `${ch.wordCount} 字` : ch.status === "outline" ? "大纲" : "未写"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 人物列表 */}
        {tab === "characters" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm">
                <Plus className="w-3.5 h-3.5" />
                新增人物
              </Button>
            </div>
            {characters.length === 0 ? (
              <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>还没有人物卡片</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="rounded-lg border border-[hsl(var(--border))] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{char.name}</span>
                      <span className="text-xs text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] rounded px-1.5 py-0.5">
                        {char.role}
                      </span>
                    </div>
                    {char.currentState && (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        {char.currentState}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 世界观/伏笔 tab - 简版占位 */}
        {(tab === "world" || tab === "foreshadowing") && (
          <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>该功能将在 Phase 2 上线</p>
          </div>
        )}
      </main>
    </div>
  );
}
