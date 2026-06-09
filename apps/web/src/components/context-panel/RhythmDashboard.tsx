import { useMemo } from "react";
import { BarChart3, BookOpen, TrendingUp, Target, Zap } from "lucide-react";

interface Chapter {
  id: string;
  order: number;
  title: string;
  status: string;
  wordCount: number;
  summary?: string | null;
  themeScore?: number | null;
  themeScoreReason?: string | null;
}

interface Character {
  id: string;
  name: string;
  role: string;
  currentState?: string | null;
  arcMilestones?: Array<{ description: string; reached?: boolean; reachedAt?: number }>;
}

interface Props {
  chapters: Chapter[];
  characters?: Character[];
  currentChapterId?: string;
  onChapterClick?: (id: string) => void;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed" ? "bg-green-400" :
    status === "in_progress" ? "bg-blue-400" :
    "bg-white/20";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

function ThemeScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-green-400 bg-green-500/10" :
    score >= 60 ? "text-blue-400 bg-blue-500/10" :
    score >= 40 ? "text-white/50 bg-white/5" :
    "text-amber-400/70 bg-amber-500/10";
  return (
    <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${color}`}>{score}</span>
  );
}

export function RhythmDashboard({ chapters, characters = [], currentChapterId, onChapterClick }: Props) {
  const stats = useMemo(() => {
    if (chapters.length === 0)
      return { total: 0, completed: 0, totalWords: 0, avgWords: 0, maxWords: 0, avgTheme: null };
    const completed = chapters.filter((c) => c.status === "completed").length;
    const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
    const avgWords = chapters.length ? Math.round(totalWords / chapters.length) : 0;
    const maxWords = Math.max(...chapters.map((c) => c.wordCount), 1);
    const scoredChapters = chapters.filter((c) => c.themeScore != null);
    const avgTheme = scoredChapters.length
      ? Math.round(scoredChapters.reduce((s, c) => s + (c.themeScore ?? 0), 0) / scoredChapters.length)
      : null;
    return { total: chapters.length, completed, totalWords, avgWords, maxWords, avgTheme };
  }, [chapters]);

  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  function barColor(wordCount: number, isActive: boolean, themeScore?: number | null): string {
    if (isActive) return "bg-purple-400";
    if (wordCount === 0) return "bg-white/10";
    if (themeScore != null) {
      if (themeScore >= 80) return "bg-green-400/60";
      if (themeScore >= 60) return "bg-blue-400/50";
      if (themeScore < 40) return "bg-amber-400/40";
    }
    const ratio = wordCount / stats.avgWords;
    if (ratio >= 1.5) return "bg-blue-400/60";
    if (ratio >= 1.1) return "bg-white/40";
    return "bg-white/20";
  }

  const arcChars = characters.filter(
    (c) => c.arcMilestones && c.arcMilestones.length > 0
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-white/[0.03] border border-white/8 rounded-xl">
          <p className="text-[10px] text-white/30 mb-1">总章节</p>
          <p className="text-lg font-bold text-white/70">{stats.total}</p>
          <p className="text-[10px] text-white/30">{stats.completed} 已完成</p>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/8 rounded-xl">
          <p className="text-[10px] text-white/30 mb-1">总字数</p>
          <p className="text-lg font-bold text-white/70">
            {stats.totalWords >= 10000
              ? `${(stats.totalWords / 10000).toFixed(1)}万`
              : stats.totalWords.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/30">均 {stats.avgWords.toLocaleString()}字/章</p>
        </div>
        <div className="p-3 bg-white/[0.03] border border-white/8 rounded-xl">
          {stats.avgTheme != null ? (
            <>
              <p className="text-[10px] text-white/30 mb-1 flex items-center gap-1">
                <Target className="w-2.5 h-2.5" />主旨均分
              </p>
              <p className={`text-lg font-bold ${
                stats.avgTheme >= 70 ? "text-green-400" :
                stats.avgTheme >= 50 ? "text-blue-400" : "text-amber-400"
              }`}>{stats.avgTheme}</p>
              <p className="text-[10px] text-white/30">满分100</p>
            </>
          ) : (
            <>
              <p className="text-[10px] text-white/30 mb-1">写作进度</p>
              <p className="text-lg font-bold text-white/70">{progressPct}%</p>
              <p className="text-[10px] text-white/30">{stats.total - stats.completed} 章未写</p>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/40 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />写作进度
          </span>
          <span className="text-xs text-white/40">{progressPct}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Bar chart */}
      {chapters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />字数 & 主旨贡献度
            </span>
            <div className="flex items-center gap-2 text-[9px] text-white/25">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400/60 inline-block" />主旨高</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-400 inline-block" />当前</span>
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-20">
            {chapters.slice(0, 60).map((ch) => {
              const isActive = ch.id === currentChapterId;
              const pct = stats.maxWords > 0 ? (ch.wordCount / stats.maxWords) * 100 : 0;
              return (
                <div
                  key={ch.id}
                  className="flex-1 flex flex-col items-center gap-0.5 group cursor-pointer"
                  onClick={() => onChapterClick?.(ch.id)}
                  title={`第${ch.order}章《${ch.title}》${ch.wordCount}字${ch.themeScore != null ? ` 主旨:${ch.themeScore}` : ""}`}
                >
                  <div className="w-full relative flex flex-col justify-end" style={{ height: "64px" }}>
                    <div
                      className={`w-full rounded-sm transition-all ${barColor(ch.wordCount, isActive, ch.themeScore)} ${
                        isActive ? "ring-1 ring-purple-400/50" : ""
                      } group-hover:opacity-80`}
                      style={{ height: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/20">第1章</span>
            <span className="text-[9px] text-white/20">第{chapters.length}章</span>
          </div>
        </div>
      )}

      {/* Character arc progress */}
      {arcChars.length > 0 && (
        <div>
          <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />角色弧光
          </p>
          <div className="space-y-2">
            {arcChars.map((char) => {
              const milestones = char.arcMilestones ?? [];
              const reached = milestones.filter((m) => m.reached).length;
              const total = milestones.length;
              const pct = total > 0 ? Math.round((reached / total) * 100) : 0;
              return (
                <div key={char.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-white/60">{char.name}</span>
                      <span className="text-[10px] text-white/25">
                        {reached}/{total} 里程碑
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40">{pct}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 80 ? "bg-green-400" : pct >= 50 ? "bg-blue-400" : "bg-white/30"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {char.currentState && (
                    <p className="text-[10px] text-white/25 mt-0.5 truncate">{char.currentState}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chapter list */}
      <div>
        <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
          <BookOpen className="w-3 h-3" />章节列表
        </p>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {chapters.map((ch) => {
            const isActive = ch.id === currentChapterId;
            return (
              <div
                key={ch.id}
                onClick={() => onChapterClick?.(ch.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "bg-purple-500/10 border border-purple-500/20"
                    : "hover:bg-white/[0.03]"
                }`}
              >
                <StatusDot status={ch.status} />
                <span className={`text-xs flex-1 truncate ${isActive ? "text-white/80" : "text-white/50"}`}>
                  {ch.order}. {ch.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {ch.themeScore != null && <ThemeScoreBadge score={ch.themeScore} />}
                  <span className="text-[10px] text-white/25">
                    {ch.wordCount > 0 ? `${ch.wordCount}字` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
          {chapters.length === 0 && (
            <p className="text-xs text-white/20 py-4 text-center">暂无章节</p>
          )}
        </div>
      </div>
    </div>
  );
}
