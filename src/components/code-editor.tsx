import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { markdown } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { Sparkles } from "lucide-react";
import type { FavoriteItem, InlineAISelection } from "@/app/types";

export type CodeEditorHandle = {
  openInlineAI: () => void;
  focus: () => void;
};

type HighlightRange = { start: number; end: number } | null;

const setInlineAIHighlight = StateEffect.define<HighlightRange>();

const inlineAIHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(highlights, transaction) {
    let next = highlights.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setInlineAIHighlight)) continue;
      const range = effect.value;
      if (!range || range.start === range.end) {
        next = Decoration.none;
        continue;
      }
      const from = Math.max(0, Math.min(range.start, transaction.state.doc.length));
      const to = Math.max(from, Math.min(range.end, transaction.state.doc.length));
      next = Decoration.set([Decoration.mark({ class: "cm-inline-ai-selection" }).range(from, to)]);
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field)
});

const editorTheme = EditorView.theme({
  "&": {
    minHeight: "100%",
    height: "100%",
    background: "transparent",
    color: "var(--foreground)",
    fontSize: "13px"
  },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  },
  ".cm-content": {
    minHeight: "100%",
    padding: "0 0 0 1.75rem",
    caretColor: "var(--foreground)"
  },
  ".cm-gutters": {
    display: "none"
  },
  ".cm-activeLine": {
    background: "transparent"
  },
  ".cm-activeLineGutter": {
    background: "transparent"
  },
  "&.cm-focused": {
    outline: "none"
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "color-mix(in oklab, var(--primary) 26%, transparent)"
  }
});

function languageExtension(type: FavoriteItem["type"]) {
  if (type === "json") return json();
  if (type === "code") return javascript({ jsx: true, typescript: true });
  return markdown();
}

export const CodeEditor = forwardRef<CodeEditorHandle, {
  item: FavoriteItem;
  value: string;
  inlineAISelection: InlineAISelection | null;
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
  onOpenInlineAI: (selection: InlineAISelection) => void;
}>(function CodeEditor({ item, value, inlineAISelection, onChange, onCommit, onOpenInlineAI }, ref) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [lineButton, setLineButton] = useState<{ top: number; lineFrom: number } | null>(null);
  const valueRef = useRef(value);
  const itemRef = useRef(item);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const onOpenInlineAIRef = useRef(onOpenInlineAI);

  useEffect(() => {
    valueRef.current = value;
    itemRef.current = item;
    onChangeRef.current = onChange;
    onCommitRef.current = onCommit;
    onOpenInlineAIRef.current = onOpenInlineAI;
  }, [item, value, onChange, onCommit, onOpenInlineAI]);

  function editorSelection(view: EditorView, fallbackPos?: number) {
    const selection = view.state.selection.main;
    if (!selection.empty) return { start: selection.from, end: selection.to };
    const pos = fallbackPos ?? selection.head;
    return { start: pos, end: pos };
  }

  function popupPosition(view: EditorView, pos: number) {
    const coords = view.coordsAtPos(pos);
    const host = wrapperRef.current?.getBoundingClientRect();
    return {
      popupX: coords?.left ?? host?.left ?? window.innerWidth - 500,
      popupY: (coords?.bottom ?? host?.top ?? 80) + 8
    };
  }

  function openInlineAIFromView(view: EditorView | null, fallbackPos?: number, popup?: { popupX: number; popupY: number }) {
    if (!view) return;
    const { start, end } = editorSelection(view, fallbackPos);
    const nextPopup = popup ?? popupPosition(view, end);
    onOpenInlineAIRef.current({
      itemId: itemRef.current.id,
      start,
      end,
      selectedText: view.state.doc.sliceString(start, end),
      ...nextPopup
    });
  }

  useImperativeHandle(ref, () => ({
    openInlineAI() {
      openInlineAIFromView(viewRef.current);
    },
    focus() {
      viewRef.current?.focus();
    }
  }), []);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          basicSetup,
          languageExtension(itemRef.current.type),
          editorTheme,
          inlineAIHighlightField,
          keymap.of([{
            key: "Mod-j",
            run(view) {
              openInlineAIFromView(view);
              return true;
            }
          }]),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            const nextValue = update.state.doc.toString();
            valueRef.current = nextValue;
            onChangeRef.current(nextValue);
          }),
          EditorView.domEventHandlers({
            mousemove(event, view) {
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
              if (pos == null) {
                setLineButton(null);
                return;
              }
              const line = view.state.doc.lineAt(pos);
              const coords = view.coordsAtPos(line.from);
              const host = wrapperRef.current?.getBoundingClientRect();
              if (!coords || !host) return;
              setLineButton({ top: Math.max(0, coords.top - host.top), lineFrom: line.from });
            },
            blur(_event, view) {
              onCommitRef.current(view.state.doc.toString());
            }
          })
        ]
      })
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [item.id, item.type]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: value }
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const range = inlineAISelection?.itemId === item.id
      ? { start: inlineAISelection.start, end: inlineAISelection.end }
      : null;
    view.dispatch({ effects: setInlineAIHighlight.of(range) });
  }, [inlineAISelection, item.id]);

  function openFromLineButton() {
    const view = viewRef.current;
    if (!view || !lineButton || !wrapperRef.current) return;
    const host = wrapperRef.current.getBoundingClientRect();
    openInlineAIFromView(view, lineButton.lineFrom, {
      popupX: host.left + 32,
      popupY: host.top + lineButton.top + 28
    });
  }

  return (
    <div className="favorite-code-editor relative h-full min-h-0" ref={wrapperRef} onMouseLeave={() => setLineButton(null)}>
      <div className="h-full min-h-0" ref={hostRef} />
      {lineButton ? (
        <button
          type="button"
          className="absolute left-0 z-10 grid size-6 -translate-x-1 place-items-center rounded-md border bg-background text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground"
          style={{ top: lineButton.top }}
          title="AI 插入或替换"
          onMouseDown={(event) => event.preventDefault()}
          onClick={openFromLineButton}
        >
          <Sparkles className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
});
