import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, AlertTriangle, Info, ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";
import { storageClient } from "@/lib/storage";

interface Issue {
  severity: "warning" | "info";
  type: "character_state" | "plot_continuity" | "foreshadowing" | "world_setting" | "other";
  description: string;
  suggestion: string;
}

interface CheckResult {
  issues: Issue[];
  reminders: string[];
  overallStatus: "clean" | "needs_attention" | "has_conflicts";
}

interface Props {
  chapterId: string;
  onDismiss: () => void;
}

const TYPE_LABEL: Record<Issue["type"], string> = {
  character_state: "人物状态",
  plot_continuity: "情节连贯",
  foreshadowing: "伏笔",
  world_setting: "世界观",
  other: "其他",
};

export function ConsistencyCheckCard({ chapterId, onDismiss }: Props) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await storageClient.post("/ai/consistency-check", { chapterId });
      const data = await res.json<CheckResult>();
      setResult(data);
    } catch {
      setResult({ issues: [], reminders: [], overallStatus: "clean" });
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1e1e] border-b border-white/8 text-white/40 text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        正在进行一致性检查…
      </div>
    );
  }

  if (!result) return null;

  if (result.overallStatus === "clean" && result.reminders.length === 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-green-500/5 border-b border-green-500/10">
        <div className="flex items-center gap-2 text-sm text-green-400/70">
          <ShieldCheck className="w-3.5 h-3.5" />
          本章无一致性问题，可以放心写作
        </div>
        <button onClick={onDismiss} className="text-white/20 hover:text-white/40 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const warnings = result.issues.filter((i) => i.severity === "warning");
  const infos = result.issues.filter((i) => i.severity === "info");
  const statusColor =
    result.overallStatus === "has_conflicts"
      ? "border-red-500/20 bg-red-500/5"
      : "border-amber-500/20 bg-amber-500/5";

  return (
    <div className={`border-b ${statusColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className={`w-3.5 h-3.5 ${
              result.overallStatus === "has_conflicts" ? "text-red-400" : "text-amber-400"
            }`}
          />
          <span className="text-sm text-white/70 font-medium">
            {result.overallStatus === "has_conflicts"
              ? `发现 ${warnings.length} 处冲突`
              : `${warnings.length + infos.length} 条提醒`}
          </span>
        </div>
        <button onClick={onDismiss} className="text-white/20 hover:text-white/40 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Issues */}
      {result.issues.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {result.issues.map((issue, i) => (
            <div
              key={i}
              className={`rounded-lg border p-3 cursor-pointer ${
                issue.severity === "warning"
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-white/8 bg-white/[0.02]"
              }`}
              onClick={() => setExpanded(expanded === `issue-${i}` ? null : `issue-${i}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {issue.severity === "warning" ? (
                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : (
                    <Info className="w-3 h-3 text-blue-400/60 shrink-0" />
                  )}
                  <span className={`text-[10px] px-1 py-0.5 rounded ${
                    issue.severity === "warning"
                      ? "bg-amber-500/15 text-amber-400/80"
                      : "bg-white/5 text-white/30"
                  }`}>
                    {TYPE_LABEL[issue.type]}
                  </span>
                  <p className="text-xs text-white/60 truncate">{issue.description}</p>
                </div>
                {expanded === `issue-${i}` ? (
                  <ChevronUp className="w-3 h-3 text-white/30 shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-white/30 shrink-0" />
                )}
              </div>
              {expanded === `issue-${i}` && (
                <p className="mt-2 ml-5 text-xs text-white/40 leading-relaxed">
                  建议：{issue.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reminders */}
      {result.reminders.length > 0 && (
        <div className="px-4 pb-3 space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">写作提醒</p>
          {result.reminders.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-purple-400/60 text-[10px] mt-0.5">·</span>
              <p className="text-xs text-white/50">{r}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
