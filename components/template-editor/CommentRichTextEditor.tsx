"use client";

import { useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function ToolbarButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 ${
        pressed ? "bg-accent-soft text-accent" : "text-ink hover:bg-paper"
      }`}
    >
      {children}
    </button>
  );
}

export function CommentRichTextEditor({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [linkError, setLinkError] = useState<string | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        underline: false,
        trailingNode: false,
        link: {
          openOnClick: false,
          defaultProtocol: "https",
          protocols: ["http", "https"],
          HTMLAttributes: {
            rel: "noopener noreferrer",
          },
          isAllowedUri: (url, ctx) =>
            ctx.defaultValidate(url) && isHttpUrl(url),
        },
      }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class:
          "min-h-48 px-3 py-2 text-sm leading-6 focus:outline-none",
        "aria-label": "Comment text",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
  });

  const toolbar = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          bold: false,
          italic: false,
          strike: false,
          bulletList: false,
          orderedList: false,
          link: false,
          canUndo: false,
          canRedo: false,
        };
      }
      return {
        bold: ctx.editor.isActive("bold"),
        italic: ctx.editor.isActive("italic"),
        strike: ctx.editor.isActive("strike"),
        bulletList: ctx.editor.isActive("bulletList"),
        orderedList: ctx.editor.isActive("orderedList"),
        link: ctx.editor.isActive("link"),
        canUndo: ctx.editor.can().undo(),
        canRedo: ctx.editor.can().redo(),
      };
    },
  });

  function applyLink() {
    if (!editor) return;
    const href = linkUrl.trim();
    if (!isHttpUrl(href)) {
      setLinkError("Use an http:// or https:// link.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
    setLinkError(null);
  }

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const previous = editor.getAttributes("link").href;
    setLinkUrl(typeof previous === "string" && previous ? previous : "https://");
    setLinkError(null);
    setLinkOpen(true);
    queueMicrotask(() => linkInputRef.current?.focus());
  }

  return (
    <div className="mt-2 rounded border border-line bg-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
      <div
        role="toolbar"
        aria-label="Comment formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-line px-1 py-1"
      >
        <ToolbarButton
          label="Bold"
          pressed={toolbar?.bold}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          pressed={toolbar?.italic}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          pressed={toolbar?.strike}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
        <ToolbarButton
          label="Bulleted list"
          pressed={toolbar?.bulletList}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          pressed={toolbar?.orderedList}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          label={toolbar?.link ? "Remove link" : "Add link"}
          pressed={toolbar?.link}
          disabled={!editor}
          onClick={toggleLink}
        >
          Link
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-line" aria-hidden="true" />
        <ToolbarButton
          label="Undo"
          disabled={!editor || !toolbar?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Undo
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor || !toolbar?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          Redo
        </ToolbarButton>
      </div>
      {linkOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-2">
          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium">
            URL
            <input
              ref={linkInputRef}
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setLinkOpen(false);
                }
              }}
              className="min-w-0 flex-1 rounded border border-line bg-white px-2 py-1 text-sm font-normal focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              placeholder="https://"
            />
          </label>
          <button
            type="button"
            className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={applyLink}
          >
            Apply
          </button>
          <button
            type="button"
            className="rounded-full border border-line px-3 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => setLinkOpen(false)}
          >
            Cancel
          </button>
          {linkError ? <p className="w-full text-xs text-defect">{linkError}</p> : null}
        </div>
      ) : null}
      {editor ? (
        <div className="comment-editor-content">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="min-h-48 px-3 py-2 text-sm text-muted">Loading editor…</div>
      )}
    </div>
  );
}
