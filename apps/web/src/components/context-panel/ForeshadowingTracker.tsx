import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { storageClient } from "@/lib/storage";

interface Foreshadowing {
  id: string;
  description: string;
  plantedChapter: number;
  plannedCollection: number | null;
  collectedChapter: number | null;
  status: "planted" | "due_soon" | "collected" | "overdue";
  relatedCharacters: string[];
}

interface Props {
  projectId: string;
  currentChapterOrder?: number;
  totalChapters?: number;
}

type TabKey = "active" | "collected" | "all";

const STATUS_CONFIG = {
  planted: { label: "已埋", color: "text-blue-400", bg: "bg-blue-500/10", icon: Zap },
  due_soon: { label: "即将到期", color: "text-amber-400", bg: "bg-amber-500/10", icon: AlertTriangle },
  overdue: { label: "已过期", color: "text-red-400", bg: "bg-red-500/10", icon: AlertTriangle },
  collected: { label: "已回收", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 },
};

function deriveStatus(
  f: Foreshadowing,
  currentChapterOrder: number
): Foreshadowing["status"] {
  if (f.collectedChapter) return "collected";
  if (f.plannedCollection) {
    if (currentChapterOrder > f.plannedCollection) return "overdue";
    if (currentChapterOrder >= f.plannedCollection - 3) return "due_soon";
  }
  return "planted";
}

export function ForeshadowingTracker({
  projectId,
  currentChapterOrder = 1,
  totalChapters = 10,
}: Props) {
  const [items, setItems] = useState<Foreshadowing[]>([]);
  const [tab, setTab] = useState<TabKey>("active");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState({
    description: "",
    plantedChapter: currentChapterOrder,
    plannedCollection: "" as number | "",
    relatedCharacters: "",
  });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await storageClient.get(`/foreshadowings?projectId=${projectId}`);
      const data = await res.json<Foreshadowing[]>();
      setItems(
        data.map((f) => ({ ...f, status: deriveStatus(f, currentChapterOrder) }))
      );
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentChapterOrder]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const resetForm = () => {
    setForm({
      description: "",
      plantedChapter: currentChapterOrder,
      plannedCollection: "",
      relatedCharacters: "",
    });
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    const payload = {
      projectId,
      description: form.description.trim(),
      plantedChapter: Number(form.plantedChapter),
      plannedCollection: form.plannedCollection ? Number(form.plannedCollection) : null,
      relatedCharacters: form.relatedCharacters
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      status: "planted" as const,
    };

    if (editingId) {
      await storageClient.patch(`/foreshadowings/${editingId}`, payload);
    } else {
      await storageClient.post("/foreshadowings", payload);
    }
    setIsAdding(false);
    setEditingId(null);
    resetForm();
    fetchItems();
  };

  const handleCollect = async (id: string) => {
    await storageClient.patch(`/foreshadowings/${id}`, {
      collectedChapter: currentChapterOrder,
      status: "collected",
    });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await storageClient.delete(`/foreshadowings/${id}`);
    fetchItems();
  };

  const startEdit = (f: Foreshadowing) => {
    setEditingId(f.id);
    setForm({
      description: f.description,
      plantedChapter: f.plantedChapter,
      plannedCollection: f.plannedCollection ?? "",
      relatedCharacters: f.relatedCharacters.join("、"),
    });
    setIsAdding(true);
  };

  const filtered = items.filter((f) => {
    if (tab === "active") return f.status !== "collected";
    if (tab === "collected") return f.status === "collected";
    return true;
  });

  const dueSoonCount = items.filter(
    (f) => f.status === "due_soon" || f.status === "overdue"
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white/80">伏笔追踪器</span>
          {dueSoonCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded-full font-medium">
              {dueSoonCount} 待回收
            </span>
          )}
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); resetForm(); }}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline visualization */}
      {items.length > 0 && (
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-[10px] text-white/30 mb-2">章节时间线</p>
          <div className="relative">
            {/* Track */}
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500/40 to-purple-500/20 rounded-full"
                style={{
                  width: `${Math.min(100, (currentChapterOrder / Math.max(totalChapters, 1)) * 100)}%`,
                }}
              />
            </div>
            {/* Foreshadowing markers */}
            {items.map((f) => {
              const plantedPct = (f.plantedChapter / Math.max(totalChapters, 1)) * 100;
              const collectPct = f.plannedCollection
                ? (f.plannedCollection / Math.max(totalChapters, 1)) * 100
                : null;
              const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.planted;
              return (
                <div key={f.id}>
                  {/* Planted dot */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-400 border border-[#1a1a1a]"
                    style={{ left: `${Math.min(98, plantedPct)}%`, marginLeft: -4 }}
                    title={`第${f.plantedChapter}章埋下：${f.description}`}
                  />
                  {/* Planned collection dot */}
                  {collectPct !== null && (
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-[#1a1a1a] ${
                        f.status === "collected"
                          ? "bg-green-400"
                          : f.status === "overdue"
                          ? "bg-red-400"
                          : f.status === "due_soon"
                          ? "bg-amber-400"
                          : "bg-white/20"
                      }`}
                      style={{ left: `${Math.min(98, collectPct)}%`, marginLeft: -4 }}
                      title={`计划第${f.plannedCollection}章回收`}
                    />
                  )}
                </div>
              );
            })}
            {/* Current position indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-400 border-2 border-[#1a1a1a] z-10"
              style={{
                left: `${Math.min(97, (currentChapterOrder / Math.max(totalChapters, 1)) * 100)}%`,
                marginLeft: -6,
              }}
              title={`当前：第${currentChapterOrder}章`}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-white/20">第1章</span>
            <span className="text-[9px] text-white/30">当前第{currentChapterOrder}章</span>
            <span className="text-[9px] text-white/20">第{totalChapters}章</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/8">
        {(["active", "collected", "all"] as TabKey[]).map((t) => {
          const labels = { active: "进行中", collected: "已回收", all: "全部" };
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs transition-colors ${
                tab === t
                  ? "text-white/80 border-b border-white/40"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {labels[t]}
              <span className="ml-1 text-[10px] opacity-60">
                (
                {t === "active"
                  ? items.filter((f) => f.status !== "collected").length
                  : t === "collected"
                  ? items.filter((f) => f.status === "collected").length
                  : items.length}
                )
              </span>
            </button>
          );
        })}
      </div>

      {/* Add / Edit form */}
      {isAdding && (
        <div className="p-4 border-b border-white/8 space-y-3 bg-white/[0.02]">
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="伏笔描述（例如：主角腰间的玉佩）"
            rows={2}
            className="bg-white/5 border-white/10 text-white/80 placeholder:text-white/20 text-sm resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">埋下章节</label>
              <Input
                type="number"
                value={form.plantedChapter}
                onChange={(e) => setForm((f) => ({ ...f, plantedChapter: Number(e.target.value) }))}
                className="bg-white/5 border-white/10 text-white/80 text-sm h-8"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">计划回收章节</label>
              <Input
                type="number"
                value={form.plannedCollection}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    plannedCollection: e.target.value ? Number(e.target.value) : "",
                  }))
                }
                placeholder="可选"
                className="bg-white/5 border-white/10 text-white/80 text-sm h-8"
              />
            </div>
          </div>
          <Input
            value={form.relatedCharacters}
            onChange={(e) => setForm((f) => ({ ...f, relatedCharacters: e.target.value }))}
            placeholder="相关人物（逗号分隔）"
            className="bg-white/5 border-white/10 text-white/80 text-sm h-8"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="bg-amber-600 hover:bg-amber-500 text-white h-7 text-xs gap-1">
              <Save className="w-3 h-3" />
              {editingId ? "更新" : "添加"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-white/40 h-7 text-xs">
              取消
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-white/20">
            <Zap className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">暂无伏笔</p>
          </div>
        )}
        {filtered.map((f) => {
          const cfg = STATUS_CONFIG[f.status] || STATUS_CONFIG.planted;
          const Icon = cfg.icon;
          const isDueSoon = f.status === "due_soon" || f.status === "overdue";
          return (
            <div
              key={f.id}
              className={`p-4 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors ${
                isDueSoon ? "border-l-2 border-l-amber-500/40" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 leading-snug">{f.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-white/30">第{f.plantedChapter}章埋下</span>
                    {f.plannedCollection && (
                      <span className="text-[10px] text-white/30">
                        → 计划第{f.plannedCollection}章回收
                      </span>
                    )}
                    {f.collectedChapter && (
                      <span className="text-[10px] text-green-400/60">
                        ✓ 第{f.collectedChapter}章已回收
                      </span>
                    )}
                    {f.relatedCharacters.length > 0 && (
                      <span className="text-[10px] text-white/25">
                        {f.relatedCharacters.join("、")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-1 shrink-0">
                  {f.status !== "collected" && (
                    <button
                      onClick={() => handleCollect(f.id)}
                      title="标记为已回收"
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-green-500/10 text-white/20 hover:text-green-400 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(f)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/5 text-white/20 hover:text-white/60 transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
