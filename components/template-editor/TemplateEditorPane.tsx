"use client";

import { useState } from "react";
import { isCommentHtmlEmpty, sanitizeCommentHtml } from "@/lib/importer/html";
import { CommentRichTextEditor } from "./CommentRichTextEditor";
import type { EditorField, EditorItem, EditorSection } from "./types";

type Selection =
  | { kind: "section"; section: EditorSection }
  | { kind: "item"; section: EditorSection; item: EditorItem }
  | { kind: "field"; section: EditorSection; item: EditorItem; field: EditorField };

async function patchJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Save failed.");
}

export function TemplateEditorPane({
  selection,
  onSectionRenamed,
  onItemRenamed,
  onFieldTextSaved,
}: {
  selection: Selection | null;
  onSectionRenamed: (id: string, name: string) => void;
  onItemRenamed: (id: string, name: string) => void;
  onFieldTextSaved: (id: string, textHtml: string | null) => void;
}) {
  if (!selection) {
    return <p className="text-muted">Select a section, item, or comment to edit.</p>;
  }

  if (selection.kind === "section") {
    return (
      <NameEditor
        key={selection.section.id}
        label="Section name"
        value={selection.section.name}
        onSave={async (name) => {
          await patchJson(`/api/sections/${selection.section.id}`, { name });
          onSectionRenamed(selection.section.id, name);
        }}
      />
    );
  }

  if (selection.kind === "item") {
    return (
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted">{selection.section.name}</p>
        <NameEditor
          key={selection.item.id}
          label="Item name"
          value={selection.item.name}
          onSave={async (name) => {
            await patchJson(`/api/items/${selection.item.id}`, { name });
            onItemRenamed(selection.item.id, name);
          }}
        />
      </div>
    );
  }

  return (
    <FieldEditor
      key={selection.field.id}
      sectionName={selection.section.name}
      itemName={selection.item.name}
      field={selection.field}
      onSaved={(textHtml) => onFieldTextSaved(selection.field.id, textHtml)}
    />
  );
}

function NameEditor({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(value);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setStatus("Saving…");
        try {
          await onSave(name.trim());
          setStatus("Saved");
        } catch (caught) {
          setStatus(null);
          setError(caught instanceof Error ? caught.message : "Save failed.");
        }
      }}
    >
      <label className="block text-sm font-medium">
        {label}
        <input
          className="mt-2 w-full rounded border border-line bg-white px-3 py-2"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <button
        type="submit"
        className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
      >
        Save
      </button>
      {status ? <p className="mt-2 text-sm text-ok">{status}</p> : null}
      {error ? <p className="mt-2 text-sm text-defect">{error}</p> : null}
    </form>
  );
}

function FieldEditor({
  sectionName,
  itemName,
  field,
  onSaved,
}: {
  sectionName: string;
  itemName: string;
  field: EditorField;
  onSaved: (textHtml: string | null) => void;
}) {
  const [text, setText] = useState(field.textHtml ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preview = sanitizeCommentHtml(text);

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">
        {sectionName} / {itemName}
      </p>
      <h2 className="display mt-1 text-3xl">{field.name}</h2>
      <p className="mt-2 text-sm text-muted">
        {field.commentType} · {field.answerType}
        {field.supportStatus === "partial" ? " · partially supported" : ""}
        {` · source row ${field.sourceRowNumber}`}
      </p>
      {field.supportStatus === "partial" ? (
        <p className="mt-3 rounded border border-line bg-paper px-3 py-2 text-sm">
          This comment is present in the Spectora export but includes HTML this importer
          cannot render yet. Supported text is shown in the editor. Empty Spectora cells
          are a different case: they were missing from the export, not dropped here.
        </p>
      ) : null}
      {field.options.length > 0 ? (
        <p className="mt-3 text-sm">
          <span className="text-muted">Options: </span>
          {field.options.map((option) => option.label).join(", ")}
        </p>
      ) : null}
      {field.unitOptions.length > 0 ? (
        <p className="mt-1 text-sm">
          <span className="text-muted">Units: </span>
          {field.unitOptions.map((option) => option.label).join(", ")}
        </p>
      ) : null}

      <form
        className="mt-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setStatus("Saving…");
          try {
            const textHtml = isCommentHtmlEmpty(text) ? null : sanitizeCommentHtml(text);
            await patchJson(`/api/fields/${field.id}`, { textHtml });
            onSaved(textHtml);
            setStatus("Saved");
          } catch (caught) {
            setStatus(null);
            setError(caught instanceof Error ? caught.message : "Save failed.");
          }
        }}
      >
        <div>
          <p className="text-sm font-medium">Comment</p>
          <CommentRichTextEditor
            initialHtml={field.textHtml ?? ""}
            onChange={setText}
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Save
        </button>
        {status ? <p className="mt-2 text-sm text-ok">{status}</p> : null}
        {error ? <p className="mt-2 text-sm text-defect">{error}</p> : null}
      </form>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-sm font-medium">Sanitized preview</p>
        <p className="mt-1 text-xs text-muted">
          Scripts and unsafe attributes are not executed. Preview uses the same sanitizer
          as the rest of the app.
        </p>
        <div
          className="comment-preview mt-3 space-y-2 text-sm leading-6"
          dangerouslySetInnerHTML={{ __html: preview || "<p class='text-muted'>No comment text.</p>" }}
        />
      </div>
    </div>
  );
}
