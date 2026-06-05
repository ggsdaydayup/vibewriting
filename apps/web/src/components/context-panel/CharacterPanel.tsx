import { useState } from "react";
import { Plus, X, ChevronDown, ChevronRight, Users } from "lucide-react";
import { api } from "../../lib/api/client";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import type { Character } from "@vibewriting/shared";

const ROLE_LABELS: Record<string, string> = {
  protagonist: "主角",
  deuteragonist: "二号主角",
  antagonist: "反派",
  supporting: "配角",
};

interface CharacterPanelProps {
  projectId: string;
  characters: Character[];
  onUpdate: (characters: Character[]) => void;
}

interface CharacterFormData {
  name: string;
  role: Character["role"];
  description: string;
  currentState: string;
  startState: string;
  endState: string;
  behaviorRules: string[];
}

const EMPTY_FORM: CharacterFormData = {
  name: "",
  role: "supporting",
  description: "",
  currentState: "",
  startState: "",
  endState: "",
  behaviorRules: [],
};

export function CharacterPanel({ projectId, characters, onUpdate }: CharacterPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CharacterFormData>(EMPTY_FORM);
  const [newRule, setNewRule] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function addRule() {
    if (newRule.trim()) {
      setForm((f) => ({ ...f, behaviorRules: [...f.behaviorRules, newRule.trim()] }));
      setNewRule("");
    }
  }

  async function saveCharacter() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const char = await api.post<Character>("/characters", {
        projectId,
        name: form.name,
        role: form.role,
        description: form.description || undefined,
        currentState: form.currentState || undefined,
        startState: form.startState || undefined,
        endState: form.endState || undefined,
        behaviorRules: form.behaviorRules,
      });
      onUpdate([...characters, char]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCharacter(id: string) {
    await api.delete(`/characters/${id}`);
    onUpdate(characters.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4 text-purple-400" />
          人物卡片
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Character Form */}
      {showForm && (
        <div className="rounded-lg border border-[hsl(var(--border))] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">姓名 *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="角色名"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">身份</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Character["role"] }))}
                className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {Object.entries(ROLE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">人物简介</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="外貌、性格、背景..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">起始状态</label>
              <Input
                value={form.startState}
                onChange={(e) => setForm((f) => ({ ...f, startState: e.target.value }))}
                placeholder="例：胆小的书生"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">终点状态</label>
              <Input
                value={form.endState}
                onChange={(e) => setForm((f) => ({ ...f, endState: e.target.value }))}
                placeholder="例：铁血统帅"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">当前状态</label>
            <Input
              value={form.currentState}
              onChange={(e) => setForm((f) => ({ ...f, currentState: e.target.value }))}
              placeholder="当前章节中的状态"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">行为规则</label>
            <div className="flex gap-2">
              <Input
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRule()}
                placeholder="例：遇到弱者会出手相助"
              />
              <Button variant="outline" size="sm" onClick={addRule}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {form.behaviorRules.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.behaviorRules.map((r, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs">
                    {r}
                    <button onClick={() => setForm((f) => ({ ...f, behaviorRules: f.behaviorRules.filter((_, j) => j !== i) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>取消</Button>
            <Button size="sm" onClick={saveCharacter} disabled={saving || !form.name.trim()}>
              {saving ? "保存中..." : "添加人物"}
            </Button>
          </div>
        </div>
      )}

      {/* Character List */}
      {characters.length === 0 && !showForm && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] py-2">还没有人物，点击 + 添加</p>
      )}
      <div className="space-y-2">
        {characters.map((char) => (
          <div key={char.id} className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
              onClick={() => setExpanded(expanded === char.id ? null : char.id)}
            >
              <div className="flex items-center gap-2">
                {expanded === char.id
                  ? <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  : <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                }
                <span className="font-medium">{char.name}</span>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{ROLE_LABELS[char.role]}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteCharacter(char.id); }}
                className="text-[hsl(var(--muted-foreground))] hover:text-red-400 opacity-0 group-hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </button>

            {expanded === char.id && (
              <div className="px-3 pb-3 space-y-2 text-xs border-t border-[hsl(var(--border))]">
                {char.description && (
                  <p className="text-[hsl(var(--muted-foreground))] pt-2">{char.description}</p>
                )}
                {char.currentState && (
                  <div>
                    <span className="text-[hsl(var(--muted-foreground))]">当前：</span>
                    <span>{char.currentState}</span>
                  </div>
                )}
                {(char.startState || char.endState) && (
                  <div className="flex gap-3">
                    {char.startState && (
                      <div><span className="text-[hsl(var(--muted-foreground))]">起：</span>{char.startState}</div>
                    )}
                    {char.endState && (
                      <div><span className="text-[hsl(var(--muted-foreground))]">终：</span>{char.endState}</div>
                    )}
                  </div>
                )}
                {char.behaviorRules.length > 0 && (
                  <div>
                    <p className="text-[hsl(var(--muted-foreground))] mb-1">行为规则：</p>
                    <ul className="space-y-0.5">
                      {char.behaviorRules.map((r, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-purple-400 shrink-0">·</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
