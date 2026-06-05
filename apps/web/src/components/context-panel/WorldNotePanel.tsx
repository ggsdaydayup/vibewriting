import { useState } from "react";
import { Plus, X, Globe, ChevronDown, ChevronRight } from "lucide-react";
import { api } from "../../lib/api/client";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import type { WorldNote } from "@vibewriting/shared";

const CATEGORY_PRESETS = ["地理", "势力", "魔法/体系", "历史", "道具", "规则", "其他"];

interface WorldNotePanelProps {
  projectId: string;
  notes: WorldNote[];
  onUpdate: (notes: WorldNote[]) => void;
}

export function WorldNotePanel({ projectId, notes, onUpdate }: WorldNotePanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("其他");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const grouped = CATEGORY_PRESETS.reduce<Record<string, typeof notes>>((acc, cat) => {
    acc[cat] = notes.filter((n) => n.category === cat);
    return acc;
  }, {});

  async function saveNote() {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      const note = await api.post<WorldNote>("/world-notes", {
        projectId,
        title,
        category,
        content,
      });
      onUpdate([...notes, note]);
      setTitle("");
      setContent("");
      setCategory("其他");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    await api.delete(`/world-notes/${id}`);
    onUpdate(notes.filter((n) => n.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Globe className="w-4 h-4 text-purple-400" />
          世界观条目
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-[hsl(var(--border))] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">标题 *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="条目名称"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[hsl(var(--muted-foreground))]">分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--input))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[hsl(var(--muted-foreground))]">内容 *</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="详细描述..."
              rows={4}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>取消</Button>
            <Button size="sm" onClick={saveNote} disabled={saving || !title.trim() || !content.trim()}>
              {saving ? "保存中..." : "添加条目"}
            </Button>
          </div>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] py-2">还没有世界观条目</p>
      )}

      <div className="space-y-4">
        {CATEGORY_PRESETS.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
          <div key={cat}>
            <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1.5">{cat}</p>
            <div className="space-y-1.5">
              {grouped[cat].map((note) => (
                <div key={note.id} className="rounded-lg border border-[hsl(var(--border))] overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] transition-colors"
                    onClick={() => setExpanded(expanded === note.id ? null : note.id)}
                  >
                    <div className="flex items-center gap-1.5">
                      {expanded === note.id
                        ? <ChevronDown className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                        : <ChevronRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                      }
                      <span>{note.title}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="text-[hsl(var(--muted-foreground))] hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                  {expanded === note.id && (
                    <div className="px-3 pb-3 pt-2 text-xs text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
