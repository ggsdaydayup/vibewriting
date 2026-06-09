import { useMemo } from "react";
import { BarChart3, BookOpen, CheckCircle2, FileText, TrendingUp } from "lucide-react";

interface Chapter {
  id: string;
  order: number;
  title: string;
  status: string;
  wordCount: number;
  summary?: string | null;
}

interface Props {
  chapters: Chapter[];
  currentChapterId?: string;
  onChapterClick?: (id: string) => void;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-green-400"
      : status === "in_progress"
      ? "bg-blue-400"
      : "bg-white/20";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />;
}

export function RhythmDashboard({ chapters, currentChapterId, onChapterClick }: Props) {
  const stats = useMemo(() => {
    if (chapters.length === 0)
      return { total: 0, completed: 0, totalWords: 0, avgWords: 0, maxWords: 0 };
    const completed = chapters.filter((c) => c.status === "completed").length;
    const totalWords = chapters.reduce((s, c) => s + c.wordCount, 0);
    const avgWords = Math.round(totalWords / chapters.length);
    const maxWords = Math.max(...chapters.map((c) => c.wordCount), 1);
    return { total: chapters.length, completed, totalWords, avgWords, maxWords };
  }, [chapters]);

  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // 分段着色：章节字数 relative to avg
  function barColor(wordCount: number, isActive: boolean): string {
    if (isActive) return "bg-purple-400";
    if (wordCount === 0) return "bg-white/10";
    const ratio = wordCount / stats.avgWords;
    if (ratio >= 1.5) return "bg-blue-400/70"; // 高爽点密度
    if (ratio >= 1.1) return "bg-green-400/60";
    if (ratio >= 0.7) return "bg-white/40";
    return "bg-white/20"; // 较短章节
  }

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
          <p className="text-[10px] text-white/30 mb-1">写作进度</p>
          <p className="text-lg font-bold text-white/70">{progressPct}%</p>
          <p className="text-[10px] text-white/30">{stats.total - stats.completed} 章未写</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-white/40 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            写作进度
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

      {/* Bar chart — word count per chapter */}
      {chapters.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              字数分布
            </span>
            <div className="flex items-center gap-2 text-[9px] text-white/25">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400/70 inline-block" />超均值1.5x</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-400 inline-block" />当前章</span>
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
                  title={`第${ch.order}章《${ch.title}》${ch.wordCount}字`}
                >
                  <div className="w-full relative flex flex-col justify-end" style={{ height: "64px" }}>
                    <div
                      className={`w-full rounded-sm transition-all ${barColor(ch.wordCount, isActive)} ${
                        isActive ? "ring-1 ring-purple-400/50" : ""
                      } group-hover:opacity-80`}
                      style={{ height: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {chapters.length > 60 && (
              <div className="text-[9px] text-white/20 ml-1 self-center">+{chapters.length - 60}</div>
            )}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/20">第1章</span>
            <span className="text-[9px] text-white/20">第{chapters.length}章</span>
          </div>
        </div>
      )}

      {/* Chapter list compact */}
      <div>
        <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          章节列表
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
                <span className="text-[10px] text-white/25 shrink-0">
                  {ch.wordCount > 0 ? `${ch.wordCount}字` : "—"}
                </span>
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
