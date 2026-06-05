import { useState, useRef } from "react";
import { Zap, X } from "lucide-react";
import { Button } from "../ui/Button";
import { streamRequest } from "../../lib/api/client";

interface AutopilotModalProps {
  chapterId: string;
  onClose: () => void;
  onGenerated: (content: string) => void;
}

type Phase = "input" | "generating" | "review";

export function AutopilotModal({ chapterId, onClose, onGenerated }: AutopilotModalProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [vibePrompt, setVibePrompt] = useState("");
  const [targetWordCount, setTargetWordCount] = useState(2000);
  const [generatedText, setGeneratedText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  async function startGeneration() {
    setPhase("generating");
    setGeneratedText("");
    abortRef.current = new AbortController();

    let accumulated = "";
    await streamRequest(
      "/ai/autopilot",
      {
        chapterId,
        vibePrompt: vibePrompt || undefined,
        targetWordCount,
      },
      (chunk) => {
        accumulated += chunk;
        setGeneratedText(accumulated);
        setWordCount(accumulated.replace(/\s/g, "").length);
      },
      abortRef.current.signal
    ).catch(() => {}).finally(() => {
      setPhase("review");
    });
  }

  function abort() {
    abortRef.current?.abort();
    setPhase("review");
  }

  function acceptResult() {
    onGenerated(generatedText);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-[hsl(var(--border))] bg-[hsl(0,0%,8%)] shadow-2xl">

        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-sm">AI 全自动写本章</span>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5">
          {phase === "input" && (
            <div className="space-y-5">
              <div className="rounded-lg bg-[hsl(var(--muted))] p-4 text-sm space-y-1.5">
                <p className="text-[hsl(var(--muted-foreground))] text-xs font-medium uppercase tracking-wider">
                  AI 已加载
                </p>
                <p>✓ 写作人设（Persona）</p>
                <p>✓ 全局人物状态与世界观</p>
                <p>✓ 上一章结尾快照</p>
                <p>✓ 待回收伏笔提醒</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">
                  本章氛围提示词
                  <span className="ml-1 text-xs">（可为空，AI 将自行发挥）</span>
                </label>
                <textarea
                  value={vibePrompt}
                  onChange={(e) => setVibePrompt(e.target.value)}
                  placeholder="例：雨夜、压抑、即将爆发..."
                  rows={3}
                  className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-[hsl(var(--muted-foreground))] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">
                  目标字数
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={500}
                    max={5000}
                    step={500}
                    value={targetWordCount}
                    onChange={(e) => setTargetWordCount(Number(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-sm w-16 text-right">{targetWordCount} 字</span>
                </div>
              </div>
            </div>
          )}

          {(phase === "generating" || phase === "review") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {phase === "generating" ? "正在写作..." : "草稿已完成"}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  {wordCount} 字
                </span>
              </div>
              <div className="rounded-lg bg-[hsl(var(--muted))] p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto font-serif">
                {generatedText}
                {phase === "generating" && (
                  <span className="animate-pulse text-purple-400">█</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-4 border-t border-[hsl(var(--border))] flex items-center justify-between">
          {phase === "input" && (
            <>
              <Button variant="ghost" onClick={onClose}>取消</Button>
              <Button onClick={startGeneration}>
                <Zap className="w-3.5 h-3.5" />
                开始生成
              </Button>
            </>
          )}
          {phase === "generating" && (
            <>
              <Button variant="ghost" onClick={abort}>中止</Button>
              <span className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse">
                AI 正在写作中...
              </span>
            </>
          )}
          {phase === "review" && (
            <>
              <Button variant="outline" onClick={() => setPhase("input")}>
                重新生成
              </Button>
              <Button onClick={acceptResult}>
                采用这个草稿
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
