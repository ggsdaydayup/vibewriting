import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, BookOpen, FileText, CheckCircle } from "lucide-react";
import { api } from "../../lib/api/client";
import { Button } from "../ui/Button";
import type { Chapter } from "@vibewriting/shared";

interface ChapterTreeProps {
  projectId: string;
  onClose?: () => void;
}

const STATUS_ICON = {
  draft: <FileText className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />,
  outline: <BookOpen className="w-3 h-3 text-yellow-400" />,
  completed: <CheckCircle className="w-3 h-3 text-green-400" />,
};

export function ChapterTree({ projectId, onClose }: ChapterTreeProps) {
  const navigate = useNavigate();
  const { chapterId } = useParams();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Chapter[]>(`/chapters/project/${projectId}`)
      .then(setChapters)
      .finally(() => setLoading(false));
  }, [projectId]);

  async function addChapter() {
    const chapter = await api.post<Chapter>("/chapters", {
      projectId,
      title: `第${chapters.length + 1}章`,
      order: chapters.length,
    });
    setChapters((prev) => [...prev, chapter]);
    navigate(`/write/${chapter.id}`);
    onClose?.();
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
        <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
          章节
        </span>
        <Button variant="ghost" size="sm" onClick={addChapter}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <p className="text-xs text-[hsl(var(--muted-foreground))] px-4 py-2">
            加载中...
          </p>
        ) : chapters.length === 0 ? (
          <p className="text-xs text-[hsl(var(--muted-foreground))] px-4 py-2">
            还没有章节
          </p>
        ) : (
          chapters.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                navigate(`/write/${ch.id}`);
                onClose?.();
              }}
              className={`w-full text-left px-4 py-2 flex items-center gap-2 text-sm transition-colors hover:bg-[hsl(var(--muted))] ${
                ch.id === chapterId
                  ? "bg-[hsl(var(--muted))] text-purple-300"
                  : "text-[hsl(var(--foreground))]"
              }`}
            >
              {STATUS_ICON[ch.status]}
              <span className="truncate flex-1">{ch.title}</span>
              {ch.wordCount > 0 && (
                <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0">
                  {ch.wordCount}字
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
