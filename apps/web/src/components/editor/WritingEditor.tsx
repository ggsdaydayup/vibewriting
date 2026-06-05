import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  GhostTextExtension,
  GhostTextKey,
  setGhostText,
  clearGhostText,
} from "./GhostTextExtension";
import { InlineCommandBar } from "./InlineCommandBar";
import { streamRequest } from "../../lib/api/client";
import { useEditorStore } from "../../lib/store/editor";
import { api } from "../../lib/api/client";

interface WritingEditorProps {
  chapterId: string;
  initialContent?: string;
  onSave?: (content: string) => void;
}

export function WritingEditor({ chapterId, initialContent, onSave }: WritingEditorProps) {
  const { setGhostText: storeSetGhostText, setIsGenerating } = useEditorStore();
  const completionAbortRef = useRef<AbortController | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostTextRef = useRef("");
  const [inlineCmd, setInlineCmd] = useState<{
    visible: boolean;
    selectedText: string;
    from: number;
    to: number;
    rect: DOMRect | null;
  }>({ visible: false, selectedText: "", from: 0, to: 0, rect: null });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "开始写作...",
      }),
      GhostTextExtension,
    ],
    content: initialContent ?? "",
    editorProps: {
      attributes: {
        class: "tiptap prose prose-invert max-w-none focus:outline-none",
      },
      handleKeyDown(view, event) {
        const ghostState = GhostTextKey.getState(view.state) as { text: string };

        if (event.key === "Tab" && ghostState.text) {
          event.preventDefault();
          const tr = view.state.tr.insertText(ghostState.text);
          view.dispatch(tr.setMeta(GhostTextKey, { text: "", from: 0 }));
          ghostTextRef.current = "";
          return true;
        }

        if (event.key === "Escape" && ghostState.text) {
          clearGhostText({ view, state: view.state });
          ghostTextRef.current = "";
          completionAbortRef.current?.abort();
          return true;
        }

        if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          const { from, to } = view.state.selection;
          if (from !== to) {
            const selectedText = view.state.doc.textBetween(from, to);
            const domCoords = view.coordsAtPos(from);
            const rect = new DOMRect(domCoords.left, domCoords.top, 0, 0);
            setInlineCmd({ visible: true, selectedText, from, to, rect });
          }
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      clearGhostText({ view: editor.view, state: editor.state });
      ghostTextRef.current = "";
      completionAbortRef.current?.abort();

      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        triggerCompletion(editor);
      }, 1500);

      if (onSave) {
        onSave(editor.getHTML());
      }
    },
  });

  const triggerCompletion = useCallback(
    async (ed: NonNullable<typeof editor>) => {
      const text = ed.getText();
      if (text.length < 10) return;

      const lastChars = text.slice(-500);
      completionAbortRef.current = new AbortController();
      setIsGenerating(true);

      let accumulated = "";
      try {
        await streamRequest(
          "/ai/complete",
          { chapterId, recentText: lastChars },
          (chunk) => {
            accumulated += chunk;
            ghostTextRef.current = accumulated;
            setGhostText({ view: ed.view, state: ed.state }, accumulated);
            storeSetGhostText(accumulated);
          },
          completionAbortRef.current.signal
        );
      } catch {
        // aborted or error - silent
      } finally {
        setIsGenerating(false);
      }
    },
    [chapterId, setIsGenerating, storeSetGhostText]
  );

  async function handleInlineEdit(instruction: string) {
    if (!editor) return;
    const { from, to, selectedText } = inlineCmd;
    setInlineCmd((s) => ({ ...s, visible: false }));

    const surroundingContext = editor.getText().slice(
      Math.max(0, from - 200),
      from
    );

    let result = "";
    await streamRequest(
      "/ai/inline",
      { chapterId, selectedText, instruction, surroundingContext },
      (chunk) => {
        result += chunk;
      }
    );

    if (result) {
      editor.chain().focus().setTextSelection({ from, to }).insertContent(result).run();
    }
  }

  useEffect(() => {
    return () => {
      completionAbortRef.current?.abort();
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const saveInterval = setInterval(async () => {
      if (!editor) return;
      const content = editor.getHTML();
      try {
        await api.patch(`/chapters/${chapterId}`, { content });
      } catch {
        // silent
      }
    }, 10000);
    return () => clearInterval(saveInterval);
  }, [editor, chapterId]);

  return (
    <div className="relative h-full">
      <EditorContent
        editor={editor}
        className="h-full px-8 py-12 overflow-y-auto"
      />
      {inlineCmd.visible && inlineCmd.rect && (
        <InlineCommandBar
          rect={inlineCmd.rect}
          onSubmit={handleInlineEdit}
          onClose={() => setInlineCmd((s) => ({ ...s, visible: false }))}
        />
      )}
    </div>
  );
}
