import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { api } from "../lib/api/client";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

interface ProviderPreset {
  label: string;
  models: string[];
  baseUrl?: string;
}

interface Settings {
  aiProvider: string;
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl?: string | null;
}

export function SettingsPage() {
  const [presets, setPresets] = useState<Record<string, ProviderPreset>>({});
  const [settings, setSettings] = useState<Settings>({
    aiProvider: "openai",
    aiModel: "gpt-4o",
    aiApiKey: "",
    aiBaseUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Record<string, ProviderPreset>>("/settings/providers"),
      api.get<Settings>("/settings"),
    ]).then(([p, s]) => {
      setPresets(p);
      setSettings(s);
    });
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
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const currentPreset = presets[settings.aiProvider];
  const isCustom = settings.aiProvider === "custom";

  return (
    <div className="min-h-screen">
      <header className="border-b border-[hsl(var(--border))] px-6 py-3 flex items-center gap-3">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <span className="font-medium">设置</span>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10">
        <h2 className="text-lg font-medium mb-6">AI 模型配置</h2>

        <form onSubmit={handleSave} className="space-y-5">
          {/* 供应商选择 */}
          <div className="space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">供应商</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setSettings((s) => ({
                      ...s,
                      aiProvider: key,
                      aiModel: preset.models[0] ?? "",
                      aiBaseUrl: preset.baseUrl ?? "",
                    }))
                  }
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    settings.aiProvider === key
                      ? "border-purple-500 text-purple-300 bg-purple-500/10"
                      : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground)/30)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 模型选择 */}
          <div className="space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">模型</label>
            {isCustom ? (
              <Input
                value={settings.aiModel}
                onChange={(e) => setSettings((s) => ({ ...s, aiModel: e.target.value }))}
                placeholder="模型名称，例：gpt-4"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {(currentPreset?.models ?? []).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSettings((s) => ({ ...s, aiModel: m }))}
                    className={`rounded px-2.5 py-1 text-xs border transition-colors ${
                      settings.aiModel === m
                        ? "border-purple-500 text-purple-300 bg-purple-500/10"
                        : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-purple-500/50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">API Key</label>
            <Input
              type="password"
              value={settings.aiApiKey === "••••••••" ? "" : settings.aiApiKey}
              onChange={(e) => setSettings((s) => ({ ...s, aiApiKey: e.target.value }))}
              placeholder={settings.aiApiKey === "••••••••" ? "已保存（输入新值可更新）" : "sk-..."}
            />
          </div>

          {/* 自定义 Base URL */}
          {(isCustom || settings.aiProvider === "deepseek" || settings.aiProvider === "qwen") && (
            <div className="space-y-2">
              <label className="text-sm text-[hsl(var(--muted-foreground))]">
                Base URL
                {!isCustom && <span className="ml-1 text-xs">（已预填，可覆盖）</span>}
              </label>
              <Input
                value={settings.aiBaseUrl ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, aiBaseUrl: e.target.value }))}
                placeholder="https://api.example.com/v1"
              />
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : saved ? "已保存 ✓" : "保存设置"}
          </Button>
        </form>
      </main>
    </div>
  );
}
