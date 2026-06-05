import { useState } from "react";
import { Sparkles, Plus, X, ChevronRight, Check } from "lucide-react";
import { api } from "../../lib/api/client";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import type { Persona, PersonaAnalysisResult } from "@vibewriting/shared";

const STYLE_TAG_PRESETS = [
  "极简", "繁复", "诗意", "克制", "放肆", "冷峻", "温暖",
  "幽默", "讽刺", "热烈", "沉郁", "明快", "古典", "现代",
];

const TONE_PRESETS = [
  "悲悯", "冷静", "热情", "忧郁", "讽刺", "温柔", "犀利", "淡然",
];

type Step = "form" | "analyzing" | "review" | "done";

interface PersonaStudioProps {
  onCreated: (persona: Persona) => void;
  onClose: () => void;
}

export function PersonaStudio({ onCreated, onClose }: PersonaStudioProps) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [toneWords, setToneWords] = useState<string[]>([]);
  const [hardRules, setHardRules] = useState<string[]>([]);
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [sampleTexts, setSampleTexts] = useState<string[]>(["", "", ""]);
  const [newRule, setNewRule] = useState("");
  const [newBanned, setNewBanned] = useState("");
  const [analysis, setAnalysis] = useState<PersonaAnalysisResult & { systemPromptFragment: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleTag(tag: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]);
  }

  function addRule() {
    if (newRule.trim()) {
      setHardRules((prev) => [...prev, newRule.trim()]);
      setNewRule("");
    }
  }

  function addBanned() {
    if (newBanned.trim()) {
      setBannedWords((prev) => [...prev, newBanned.trim()]);
      setNewBanned("");
    }
  }

  const filledSamples = sampleTexts.filter((t) => t.trim().length >= 50);

  async function analyzeAndPreview() {
    setStep("analyzing");
    try {
      const result = await api.post<PersonaAnalysisResult & { systemPromptFragment: string }>(
        "/ai/analyze-persona",
        { sampleTexts: filledSamples }
      );
      // Merge form data into analysis
      if (styleTags.length > 0) result.styleTags = [...new Set([...styleTags, ...result.styleTags])];
      if (toneWords.length > 0) result.toneWords = [...new Set([...toneWords, ...result.toneWords])];
      if (hardRules.length > 0) result.suggestedRules = [...hardRules, ...result.suggestedRules];
      if (bannedWords.length > 0) result.suggestedBannedWords = [...bannedWords, ...result.suggestedBannedWords];
      setAnalysis(result);
      setStep("review");
    } catch {
      setStep("form");
    }
  }

  async function savePersona() {
    setSaving(true);
    try {
      const persona = await api.post<Persona>("/personas", {
        name: name || analysis?.description?.slice(0, 20) || "新建人设",
        description: analysis?.description,
        styleTags: analysis?.styleTags ?? styleTags,
        toneWords: analysis?.toneWords ?? toneWords,
        hardRules: analysis?.suggestedRules ?? hardRules,
        bannedWords: analysis?.suggestedBannedWords ?? bannedWords,
        sampleTexts: filledSamples,
        extractedPatterns: analysis?.extractedPatterns,
      });
      setStep("done");
      onCreated(persona);
    } finally {
      setSaving(false);
    }
  }

  async function saveWithoutAnalysis() {
    setSaving(true);
    try {
      const persona = await api.post<Persona>("/personas", {
        name: name || "新建人设",
        styleTags,
        toneWords,
        hardRules,
        bannedWords,
        sampleTexts: filledSamples,
      });
      setStep("done");
      onCreated(persona);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-[hsl(var(--border))] bg-[hsl(0,0%,8%)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-medium text-sm">创建写作人设（Persona）</span>
          </div>
          <button onClick={onClose} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">

          {/* Step: Form */}
          {(step === "form" || step === "analyzing") && (
            <div className="p-5 space-y-6">

              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">人设名称</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例：午夜张爱玲、极简硬核体..."
                />
              </div>

              {/* Style Tags */}
              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">
                  风格标签
                  <span className="ml-1 text-xs">（点击选择）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAG_PRESETS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag, styleTags, setStyleTags)}
                      className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                        styleTags.includes(tag)
                          ? "border-purple-500 text-purple-300 bg-purple-500/10"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-purple-500/40"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone Words */}
              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">情绪基调</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_PRESETS.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => toggleTag(tone, toneWords, setToneWords)}
                      className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                        toneWords.includes(tone)
                          ? "border-purple-500 text-purple-300 bg-purple-500/10"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-purple-500/40"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hard Rules */}
              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">
                  硬性规则
                  <span className="ml-1 text-xs">（可选，例：不用感叹号）</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRule()}
                    placeholder="输入规则后按 Enter"
                  />
                  <Button variant="outline" size="sm" onClick={addRule}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {hardRules.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {hardRules.map((rule, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs">
                        {rule}
                        <button onClick={() => setHardRules((p) => p.filter((_, j) => j !== i))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Banned Words */}
              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">
                  禁用词
                  <span className="ml-1 text-xs">（可选，AI 不会使用这些词）</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newBanned}
                    onChange={(e) => setNewBanned(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addBanned()}
                    placeholder="输入禁词后按 Enter"
                  />
                  <Button variant="outline" size="sm" onClick={addBanned}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {bannedWords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {bannedWords.map((word, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2.5 py-1 text-xs text-red-300">
                        {word}
                        <button onClick={() => setBannedWords((p) => p.filter((_, j) => j !== i))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sample Texts */}
              <div className="space-y-3">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">
                  范文样本
                  <span className="ml-1 text-xs">（粘贴你喜欢的文字，AI 学习你的语感，每段至少 50 字）</span>
                </label>
                {sampleTexts.map((text, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">样本 {i + 1}</p>
                    <Textarea
                      value={text}
                      onChange={(e) => {
                        const next = [...sampleTexts];
                        next[i] = e.target.value;
                        setSampleTexts(next);
                      }}
                      placeholder="粘贴你喜欢的一段文字..."
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Analyzing */}
          {step === "analyzing" && (
            <div className="p-10 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto animate-pulse" />
              <p className="text-[hsl(var(--muted-foreground))]">AI 正在分析你的写作风格...</p>
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && analysis && (
            <div className="p-5 space-y-5">
              <div className="rounded-lg bg-purple-500/10 border border-purple-500/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-300">AI 风格解读卡</span>
                </div>
                <p className="text-sm">{analysis.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">风格标签</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.styleTags.map((t) => (
                        <span key={t} className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">{t}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">情绪基调</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.toneWords.map((t) => (
                        <span key={t} className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300">{t}</span>
                      ))}
                    </div>
                  </div>
                  {analysis.extractedPatterns.avgSentenceLength && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">平均句长</p>
                      <p className="text-xs">{analysis.extractedPatterns.avgSentenceLength} 字/句</p>
                    </div>
                  )}
                  {analysis.extractedPatterns.punctuationStyle && (
                    <div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">标点习惯</p>
                      <p className="text-xs">{analysis.extractedPatterns.punctuationStyle}</p>
                    </div>
                  )}
                </div>
                {analysis.suggestedRules.length > 0 && (
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">建议规则</p>
                    <ul className="space-y-0.5">
                      {analysis.suggestedRules.map((r, i) => (
                        <li key={i} className="text-xs flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-400 shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.suggestedBannedWords.length > 0 && (
                  <div>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">建议禁词</p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.suggestedBannedWords.map((w) => (
                        <span key={w} className="rounded text-xs bg-red-500/10 text-red-300 px-1.5 py-0.5">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Name input in review */}
              <div className="space-y-2">
                <label className="text-sm text-[hsl(var(--muted-foreground))]">为这个人设命名</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={analysis.description?.slice(0, 20) || "人设名称"}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[hsl(var(--border))] flex items-center justify-between shrink-0">
          {step === "form" && (
            <>
              <Button variant="ghost" onClick={onClose}>取消</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={saveWithoutAnalysis} disabled={saving}>
                  直接保存
                </Button>
                {filledSamples.length > 0 && (
                  <Button onClick={analyzeAndPreview}>
                    <Sparkles className="w-3.5 h-3.5" />
                    AI 分析风格
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </>
          )}
          {step === "analyzing" && (
            <span className="text-xs text-[hsl(var(--muted-foreground))] animate-pulse mx-auto">
              分析中，请稍候...
            </span>
          )}
          {step === "review" && (
            <>
              <Button variant="ghost" onClick={() => setStep("form")}>修改</Button>
              <Button onClick={savePersona} disabled={saving}>
                <Check className="w-3.5 h-3.5" />
                {saving ? "保存中..." : "确认并保存"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
