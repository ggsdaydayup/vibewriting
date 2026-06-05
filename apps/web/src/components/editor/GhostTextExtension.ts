import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const GhostTextKey = new PluginKey("ghostText");

interface GhostTextState {
  text: string;
  from: number;
}

export const GhostTextExtension = Extension.create({
  name: "ghostText",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: GhostTextKey,
        state: {
          init: (): GhostTextState => ({ text: "", from: 0 }),
          apply(tr, prev): GhostTextState {
            const meta = tr.getMeta(GhostTextKey);
            if (meta !== undefined) return meta;
            if (tr.docChanged) return { text: "", from: 0 };
            return prev;
          },
        },
        props: {
          decorations(state) {
            const { text, from } = GhostTextKey.getState(state) as GhostTextState;
            if (!text || from === 0) return DecorationSet.empty;

            const widget = Decoration.widget(from, () => {
              const span = document.createElement("span");
              span.className = "ghost-text";
              span.textContent = text;
              return span;
            });

            return DecorationSet.create(state.doc, [widget]);
          },
        },
      }),
    ];
  },
});

export function setGhostText(
  editor: { view: { dispatch: (tr: any) => void }; state: any },
  text: string
) {
  const { state } = editor;
  const { selection } = state;
  const tr = state.tr.setMeta(GhostTextKey, { text, from: selection.from });
  editor.view.dispatch(tr);
}

export function clearGhostText(editor: {
  view: { dispatch: (tr: any) => void };
  state: any;
}) {
  const tr = editor.state.tr.setMeta(GhostTextKey, { text: "", from: 0 });
  editor.view.dispatch(tr);
}
