import { useState, useRef, useEffect } from "react";
import { Wand2 } from "lucide-react";

const QUICK_ACTIONS = [
  "扩写这段内容",
  "压缩精简",
  "改变情绪为更压抑",
  "改变情绪为更轻快",
  "换成对话形式",
  "增加细节描写",
  "换个角度重写",
];

interface InlineCommandBarProps {
  rect: DOMRect;
  onSubmit: (instruction: string) => void;
  onClose: () => void;
}

export function InlineCommandBar({ rect, onSubmit, onClose }: InlineCommandBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  const style = {
    position: "fixed" as const,
    top: rect.top - 60,
    left: Math.max(16, rect.left),
    zIndex: 50,
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={style}
        className="z-50 w-80 rounded-lg border border-[hsl(var(--border))] bg-[hsl(0,0%,10%)] shadow-xl overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(var(--border))]">
          <Wand2 className="w-4 h-4 text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="改写指令..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
          />
        </form>
        <div className="py-1">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => onSubmit(action)}
              className="w-full text-left px-3 py-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
