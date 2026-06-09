import { useState } from "react";
import { Brain, Loader2, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { storageClient } from "@/lib/storage";

interface Props {
  personaId: string;
  personaName: string;
  /** 当前章节或用户粘贴的写作内容，用于学习 */
  defaultContent?: string;
}

type State = "idle" | "input" | "learning" | "done" | "error";

export function PersonaLearnButton({ personaId, personaName, defaultContent = "" }: Props) {
  const [state, setState] = useState<State>("idle");
  const [content, setContent] = useState(defaultContent);
  const [result, setResult] = useState<{ learnedSamples: number } | null>(null);
  const [error, setError] = useState("");

  async function handleLearn() {
    if (content.trim().length < 200) return;
    setState("learning");
    setError("");
    try {
      const res = await storageClient.post("/ai/persona-learn", { personaId, writtenContent: content });
      const data = await res.json<{ learnedSamples: number; systemPromptFragment: string }>();
      setResult(data);
      setState("done");
    } catch (e: any) {
      setError(e.message || "学习失败，请重试");
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setState("input")}
        className="border-white/10 text-white/50 hover:text-purple-400 hover:border-purple-500/30 gap-1.5 text-xs"
      >
        <Brain className="w-3.5 h-3.5" />
        训练人设学习我的写法
      </Button>
    );
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400/80">
        <Check className="w-4 h-4" />
        已学习第 {result?.learnedSamples ?? "?"} 个样本，人设风格档案已更新
        <button onClick={() => setState("idle")} className="text-white/20 hover:text-white/50 ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-white/[0.02] border border-white/8 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white/70">
            训练《{personaName}》学习你的写法
          </span>
        </div>
        <button
          onClick={() => setState("idle")}
          className="text-white/20 hover:text-white/50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-white/40">
        粘贴一段你自己写的文字（≥200字），AI 会分析你的语言习惯，更新人设风格档案，让续写越来越像你。
      </p>

      {state === "error" && (
        <div className="flex items-center gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="粘贴你自己写的段落……"
        rows={6}
        className="bg-black/20 border-white/10 text-white/70 placeholder:text-white/15 text-sm resize-none"
        disabled={state === "learning"}
      />

      <div className="flex items-center justify-between">
        <span className={`text-xs ${content.trim().length >= 200 ? "text-white/30" : "text-amber-400/60"}`}>
          {content.trim().length} / 200 字（最少）
        </span>
        <Button
          size="sm"
          onClick={handleLearn}
          disabled={state === "learning" || content.trim().length < 200}
          className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs"
        >
          {state === "learning" ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />学习中…</>
          ) : (
            <><Brain className="w-3.5 h-3.5" />开始学习</>
          )}
        </Button>
      </div>
    </div>
  );
}
