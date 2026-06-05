import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  BookOpen, Plus, PenLine, Settings, ArrowLeft,
  ChevronRight, Sparkles, Users, Globe, Bookmark,
} from "lucide-react";
import { api } from "../../lib/api/client";
import { Button } from "../../components/ui/Button";
import { PersonaStudio } from "../../components/persona/PersonaStudio";
import { CharacterPanel } from "../../components/context-panel/CharacterPanel";
import { WorldNotePanel } from "../../components/context-panel/WorldNotePanel";
import type { Project, Chapter, Character, Persona, WorldNote } from "@vibewriting/shared";

type Tab = "chapters" | "characters" | "world" | "persona";

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [worldNotes, setWorldNotes] = useState<WorldNote[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [tab, setTab] = useState<Tab>("chapters");
  const [loading, setLoading] = useState(true);
  const [showPersonaStudio, setShowPersonaStudio] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      api.get<Project>(`/projects/${projectId}`),
      api.get<Chapter[]>(`/chapters/project/${projectId}`),
      api.get<Character[]>(`/characters/project/${projectId}`),
      api.get<WorldNote[]>(`/world-notes/project/${projectId}`),
      api.get<Persona[]>(`/personas`),
    ]).then(async ([proj, chs, chars, notes, allPersonas]) => {
      setProject(proj);
      setChapters(chs);
      setCharacters(chars);
      setWorldNotes(notes);
      setPersonas(allPersonas);
      if (proj.personaId) {
        const p = allPersonas.find((p) => p.id === proj.personaId);
        if (p) setPersona(p);
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

  async function bindPersona(personaId: string) {
    if (!projectId) return;
    const updated = await api.patch<Project>(`/projects/${projectId}`, { personaId });
    setProject(updated);
    const p = personas.find((p) => p.id === personaId);
    if (p) setPersona(p);
  }

  function handlePersonaCreated(p: Persona) {
    setPersonas((prev) => [p, ...prev]);
    setShowPersonaStudio(false);
    bindPersona(p.id);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-[hsl(var(--muted-foreground))]">
      加载中...
    </div>
  );
  if (!project) return null;

  const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
  const completedChapters = chapters.filter((c) => c.status === "completed").length;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "chapters", label: "章节", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { key: "characters", label: "人物", icon: <Users className="w-3.5 h-3.5" /> },
    { key: "world", label: "世界观", icon: <Globe className="w-3.5 h-3.5" /> },
    { key: "persona", label: "写作人设", icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

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
        <div className="ml-auto">
          <Link to="/settings">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Project Info */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          {project.description && (
            <p className="text-[hsl(var(--muted-foreground))]">{project.description}</p>
          )}
          <div className="flex items-center gap-4 pt-2 flex-wrap">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              {chapters.length} 章 · {totalWords.toLocaleString()} 字 · {completedChapters} 章已完成
            </span>
            {persona && (
              <span className="text-sm text-purple-400 flex items-center gap-1">
                <Bookmark className="w-3.5 h-3.5" />
                {persona.name}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[hsl(var(--border))]">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
                tab === key
                  ? "border-purple-500 text-purple-300"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Chapters Tab */}
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
                <p>还没有章节，点击「新增章节」开始创作</p>
              </div>
            ) : (
              <div className="space-y-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => navigate(`/write/${ch.id}`)}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors group"
                  >
                    <span className="text-xs text-[hsl(var(--muted-foreground))] w-8 shrink-0 text-right">
                      {ch.order + 1}
                    </span>
                    <span className="flex-1 truncate">{ch.title}</span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      {ch.wordCount > 0 ? `${ch.wordCount} 字` : ch.status === "outline" ? "大纲" : "未写"}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Characters Tab */}
        {tab === "characters" && (
          <CharacterPanel
            projectId={project.id}
            characters={characters}
            onUpdate={setCharacters}
          />
        )}

        {/* World Notes Tab */}
        {tab === "world" && (
          <WorldNotePanel
            projectId={project.id}
            notes={worldNotes}
            onUpdate={setWorldNotes}
          />
        )}

        {/* Persona Tab */}
        {tab === "persona" && (
          <div className="space-y-4">
            {persona ? (
              <div className="rounded-lg border border-purple-500/40 bg-purple-500/5 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="font-medium">{persona.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowPersonaStudio(true)}>
                    更换
                  </Button>
                </div>
                {persona.description && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{persona.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(persona.styleTags as string[]).map((t) => (
                    <span key={t} className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs text-purple-300">{t}</span>
                  ))}
                  {(persona.toneWords as string[]).map((t) => (
                    <span key={t} className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs text-purple-400">{t}</span>
                  ))}
                </div>
                {(persona.hardRules as string[]).length > 0 && (
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">硬性规则</p>
                    <ul className="space-y-0.5">
                      {(persona.hardRules as string[]).map((r, i) => (
                        <li key={i} className="text-xs text-[hsl(var(--muted-foreground))]">· {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <Sparkles className="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto opacity-40" />
                <p className="text-[hsl(var(--muted-foreground))]">还没有绑定写作人设</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  Persona 决定了 AI 如何理解你的写作风格
                </p>
              </div>
            )}

            {/* Persona selector */}
            {personas.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">从已有人设中选择</p>
                <div className="space-y-1.5">
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => bindPersona(p.id)}
                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                        project.personaId === p.id
                          ? "border-purple-500 bg-purple-500/10"
                          : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                      }`}
                    >
                      <span className="text-sm">{p.name}</span>
                      {project.personaId === p.id && (
                        <span className="text-xs text-purple-400">当前使用</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => setShowPersonaStudio(true)} variant="outline" className="w-full">
              <Plus className="w-4 h-4" />
              创建新人设
            </Button>
          </div>
        )}
      </main>

      {showPersonaStudio && (
        <PersonaStudio
          onCreated={handlePersonaCreated}
          onClose={() => setShowPersonaStudio(false)}
        />
      )}
    </div>
  );
}
