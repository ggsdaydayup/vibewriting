import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, Check, Key, Cpu, Link2 } from "lucide-react";
import { api } from "../lib/api/client";

interface ProviderPreset { label: string; models: string[]; baseUrl?: string; }
interface Settings { aiProvider: string; aiModel: string; aiApiKey: string; aiBaseUrl?: string | null; }

const PROVIDER_ICONS: Record<string, string> = {
  openai: "⬛", anthropic: "🟤", deepseek: "🔵", qwen: "🟢", custom: "⚙️",
};

export function SettingsPage() {
  const [presets, setPresets] = useState<Record<string, ProviderPreset>>({});
  const [settings, setSettings] = useState<Settings>({
    aiProvider: "openai", aiModel: "gpt-4o", aiApiKey: "", aiBaseUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Record<string, ProviderPreset>>("/settings/providers"),
      api.get<Settings>("/settings"),
    ]).then(([p, s]) => { setPresets(p); setSettings(s); });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/settings", {
        aiProvider: settings.aiProvider,
        aiModel: settings.aiModel,
        aiApiKey: settings.aiApiKey,
        aiBaseUrl: settings.aiBaseUrl || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const currentPreset = presets[settings.aiProvider];
  const isCustom = settings.aiProvider === "custom";

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="sticky top-0 z-10 border-b border-white/6 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            to="/dashboard"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-medium text-white/80">设置</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white">AI 模型配置</h2>
          <p className="text-sm text-white/35 mt-1">选择 AI 供应商并填入你的 API Key</p>
        </div>

        <form onSubmit={handleSave} className="space-y-7">
          {/* Provider */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />供应商
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSettings((s) => ({
                    ...s, aiProvider: key,
                    aiModel: preset.models[0] ?? "",
                    aiBaseUrl: preset.baseUrl ?? "",
                  }))}
                  className={`relative flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm transition-all ${
                    settings.aiProvider === key
                      ? "border-purple-500/50 bg-purple-500/10 text-white"
                      : "border-white/8 bg-white/[0.02] text-white/50 hover:border-white/15 hover:text-white/70"
                  }`}
                >
                  <span className="text-base">{PROVIDER_ICONS[key] ?? "🤖"}</span>
                  <span className="font-medium">{preset.label}</span>
                  {settings.aiProvider === key && (
                    <Check className="w-3 h-3 text-purple-400 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />模型
            </div>
            {isCustom ? (
              <input
                value={settings.aiModel}
                onChange={(e) => setSettings((s) => ({ ...s, aiModel: e.target.value }))}
                placeholder="输入模型名称，例：gpt-4"
                className="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(currentPreset?.models ?? []).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, aiModel: m }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      settings.aiModel === m
                        ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                        : "border-white/8 text-white/40 hover:border-white/15 hover:text-white/60"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-wider">
              <Key className="w-3.5 h-3.5" />API Key
            </div>
            <input
              type="password"
              value={settings.aiApiKey === "••••••••" ? "" : settings.aiApiKey}
              onChange={(e) => setSettings((s) => ({ ...s, aiApiKey: e.target.value }))}
              placeholder={settings.aiApiKey === "••••••••" ? "已保存（输入新值可更新）" : "sk-..."}
              className="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 text-sm font-mono focus:outline-none focus:border-purple-500/50 transition-all"
            />
            <p className="text-xs text-white/25">Key 仅存储在你的账号中，不会被共享</p>
          </div>

          {/* Base URL */}
          {(isCustom || settings.aiProvider === "deepseek" || settings.aiProvider === "qwen") && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-medium text-white/40 uppercase tracking-wider">
                <Link2 className="w-3.5 h-3.5" />
                Base URL {!isCustom && <span className="text-white/20 normal-case tracking-normal font-normal">（可覆盖默认值）</span>}
              </div>
              <input
                value={settings.aiBaseUrl ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, aiBaseUrl: e.target.value }))}
                placeholder="https://api.example.com/v1"
                className="w-full h-10 px-4 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/20 text-sm font-mono focus:outline-none focus:border-purple-500/50 transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className={`w-full h-11 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              saved
                ? "bg-green-600/80 text-white"
                : "bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white"
            }`}
          >
            {saved ? (
              <><Check className="w-4 h-4" />已保存</>
            ) : saving ? (
              "保存中…"
            ) : (
              <><Save className="w-4 h-4" />保存设置</>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
