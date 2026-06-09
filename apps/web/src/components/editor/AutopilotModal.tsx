import { useState, useCallback } from "react";
import { Sparkles, ChevronRight, RotateCw, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { storageClient, streamRequest } from "@/lib/storage";

interface Scene {
  index: number;
  title: string;
  description: string;
  characters: string[];
  purpose: string;
  foreshadowingAction?: string;
}

interface Outline {
  emotionArc: string;
  themeConnection: string;
  scenes: Scene[];
  endingHook: string;
}

type Step = "config" | "outline" | "generating" | "done";

interface Props {
  chapterId: string;
  chapterTitle: string;
  onAccept: (content: string) => void;
  onClose: () => void;
}

export function AutopilotModal({ chapterId, chapterTitle, onAccept, onClose }: Props) {
  const [step, setStep] = useState<Step>("config");
  const [vibePrompt, setVibePrompt] = useState("");
  const [targetWordCount, setTargetWordCount] = useState(3000);

  const [outline, setOutline] = useState<Outline | null>(null);
  const [outlineRaw, setOutlineRaw] = useState("");
  const [editingOutline, setEditingOutline] = useState(false);
  const [outlineText, setOutlineText] = useState("");

  const [generatedContent, setGeneratedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: 生成大纲
  const generateOutline = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await storageClient.post("/ai/outline", { chapterId });
      const data = await res.json<{ outline: Outline | null; rawText: string }>();
      setOutline(data.outline);
      setOutlineRaw(data.rawText);
      setOutlineText(
        data.outline ? JSON.stringify(data.outline, null, 2) : data.rawText
      );
      setStep("outline");
    } catch (e: any) {
      setError(e.message || "生成大纲失败，请重试");
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  // Step 2: 确认大纲后生成正文
  const generateContent = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setStep("generating");
    setGeneratedContent("");

    const approvedOutline = editingOutline ? outlineText : outlineRaw;

    try {
      let fullContent = "";
      await streamRequest(
        "/ai/autopilot",
        { chapterId, vibePrompt: vibePrompt || undefined, targetWordCount, approvedOutline },
        (chunk) => {
          fullContent += chunk;
          setGeneratedContent(fullContent);
        }
      );
      setGeneratedContent(fullContent);
      setStep("done");
    } catch (e: any) {
      setError(e.message || "生成失败，请重试");
      setStep("outline");
    } finally {
      setIsLoading(false);
    }
  }, [chapterId, vibePrompt, targetWordCount, outlineRaw, outlineText, editingOutline]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">AI 自动驾驶</p>
              <p className="text-xs text-white/40">《{chapterTitle}》</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 bg-white/[0.02]">
          {(["config", "outline", "generating", "done"] as Step[]).map((s, i) => {
            const labels = ["配置", "审阅大纲", "生成正文", "完成"];
            const isActive = s === step;
            const isDone =
              ["config", "outline", "generating", "done"].indexOf(s) <
              ["config", "outline", "generating", "done"].indexOf(step);
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3 h-3 text-white/20" />}
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    isActive
                      ? "text-purple-400"
                      : isDone
                      ? "text-white/50"
                      : "text-white/20"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? "bg-purple-500/30 text-purple-300"
                        : isDone
                        ? "bg-white/10 text-white/50"
                        : "bg-white/5 text-white/20"
                    }`}
                  >
                    {isDone ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </div>
                  {labels[i]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Config step */}
          {step === "config" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm text-white/60">本章氛围提示词（可选）</label>
                <Textarea
                  value={vibePrompt}
                  onChange={(e) => setVibePrompt(e.target.value)}
                  placeholder="例如：剑光如虹，血洗皇城，主角此刻已无退路……"
                  rows={3}
                  className="bg-white/5 border-white/10 text-white/80 placeholder:text-white/20 resize-none focus:border-purple-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-white/60">目标字数</label>
                <div className="flex items-center gap-3">
                  {[1500, 3000, 5000, 8000].map((n) => (
                    <button
                      key={n}
                      onClick={() => setTargetWordCount(n)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        targetWordCount === n
                          ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                          : "bg-white/5 text-white/40 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      {n >= 1000 ? `${n / 1000}k` : n}字
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Outline step */}
          {step === "outline" && outline && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/[0.03] border border-white/8 rounded-xl">
                  <p className="text-xs text-white/40 mb-1">情绪弧线</p>
                  <p className="text-sm text-white/70">{outline.emotionArc}</p>
                </div>
                <div className="p-3 bg-white/[0.03] border border-white/8 rounded-xl">
                  <p className="text-xs text-white/40 mb-1">主旨关联</p>
                  <p className="text-sm text-white/70">{outline.themeConnection}</p>
                </div>
              </div>

              {!editingOutline ? (
                <>
                  <div className="space-y-2">
                    {outline.scenes.map((scene) => (
                      <div
                        key={scene.index}
                        className="p-4 bg-white/[0.03] border border-white/8 rounded-xl"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center font-bold">
                              {scene.index}
                            </span>
                            <span className="text-sm font-medium text-white/80">
                              {scene.title}
                            </span>
                          </div>
                          <span className="text-xs text-white/30 shrink-0">{scene.purpose}</span>
                        </div>
                        <p className="text-sm text-white/50 pl-7">{scene.description}</p>
                        {scene.characters.length > 0 && (
                          <div className="flex items-center gap-1.5 pl-7 mt-2">
                            {scene.characters.map((c) => (
                              <span
                                key={c}
                                className="px-2 py-0.5 bg-white/5 rounded text-xs text-white/40"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}
                        {scene.foreshadowingAction && (
                          <p className="text-xs text-amber-400/70 pl-7 mt-1.5">
                            ⚡ 伏笔：{scene.foreshadowingAction}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                    <p className="text-xs text-amber-400/80">
                      <span className="font-semibold">结尾钩子：</span>
                      {outline.endingHook}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingOutline(true)}
                    className="text-xs text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
                  >
                    修改大纲
                  </button>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-white/40">直接编辑大纲 JSON（高级）</p>
                  <Textarea
                    value={outlineText}
                    onChange={(e) => setOutlineText(e.target.value)}
                    rows={14}
                    className="bg-black/30 border-white/10 text-white/60 text-xs font-mono resize-none"
                  />
                  <button
                    onClick={() => setEditingOutline(false)}
                    className="text-xs text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
                  >
                    返回预览
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Generating step */}
          {(step === "generating" || step === "done") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">
                  {step === "generating" ? "AI 正在创作…" : "创作完成"}
                </span>
                <span className="text-xs text-white/30">
                  {generatedContent.replace(/\s/g, "").length} 字
                </span>
              </div>
              <div className="max-h-[50vh] overflow-y-auto p-4 bg-black/20 border border-white/8 rounded-xl">
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {generatedContent}
                  {step === "generating" && (
                    <span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-0.5" />
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white/40 hover:text-white/70"
          >
            取消
          </Button>

          <div className="flex items-center gap-3">
            {step === "config" && (
              <Button
                onClick={generateOutline}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                生成大纲预览
              </Button>
            )}

            {step === "outline" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateOutline}
                  disabled={isLoading}
                  className="border-white/10 text-white/60 gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  重新生成
                </Button>
                <Button
                  onClick={generateContent}
                  disabled={isLoading}
                  className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  确认大纲，开始写作
                </Button>
              </>
            )}

            {step === "generating" && (
              <Button disabled className="bg-purple-600/50 text-white gap-2 cursor-not-allowed">
                <Loader2 className="w-4 h-4 animate-spin" />
                创作中…
              </Button>
            )}

            {step === "done" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setStep("config"); setGeneratedContent(""); }}
                  className="border-white/10 text-white/60 gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  重新来过
                </Button>
                <Button
                  onClick={() => onAccept(generatedContent)}
                  className="bg-green-600 hover:bg-green-500 text-white gap-2"
                >
                  <Check className="w-4 h-4" />
                  插入编辑器
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
