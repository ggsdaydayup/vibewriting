import { useState, useRef, useEffect } from "react";
import { Send, Bot } from "lucide-react";
import { streamRequest } from "../../lib/api/client";
import type { ChatMessage } from "@vibewriting/shared";

interface AssistantPanelProps {
  chapterId: string;
}

export function AssistantPanel({ chapterId }: AssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    const newMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    await streamRequest(
      "/ai/chat",
      { chapterId, messages: newMessages },
      (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
          }
          return updated;
        });
      }
    ).finally(() => setLoading(false));
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))]">
        <Bot className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium">写作助手</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-center py-8">
            和助手聊聊你的写作想法
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm ${
              msg.role === "user"
                ? "ml-4 text-right"
                : "mr-4"
            }`}
          >
            <div
              className={`inline-block rounded-lg px-3 py-2 text-left ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {msg.content || (loading && i === messages.length - 1 ? "▋" : "")}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="p-3 border-t border-[hsl(var(--border))] flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="和助手说..."
          disabled={loading}
          className="flex-1 bg-[hsl(var(--input))] border border-[hsl(var(--border))] rounded-md px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-purple-500/50 placeholder:text-[hsl(var(--muted-foreground))]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-1.5 text-purple-400 hover:text-purple-300 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
