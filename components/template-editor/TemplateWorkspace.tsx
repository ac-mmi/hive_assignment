"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TemplateTree } from "@/components/template-tree/TemplateTree";
import { TemplateEditorPane } from "./TemplateEditorPane";
import type { EditorItem, EditorSection, EditorTemplate } from "./types";

type Selection =
  | { kind: "section"; sectionId: string }
  | { kind: "item"; sectionId: string; itemId: string }
  | { kind: "field"; sectionId: string; itemId: string; fieldId: string };

function findSection(template: EditorTemplate, sectionId: string): EditorSection | undefined {
  return template.sections.find((section) => section.id === sectionId);
}

function findItem(section: EditorSection | undefined, itemId: string): EditorItem | undefined {
  return section?.items.find((item) => item.id === itemId);
}

function selectionFromFieldId(template: EditorTemplate, fieldId: string | undefined): Selection | null {
  if (!fieldId) return null;
  for (const section of template.sections) {
    for (const item of section.items) {
      if (item.fields.some((field) => field.id === fieldId)) {
        return { kind: "field", sectionId: section.id, itemId: item.id, fieldId };
      }
    }
  }
  return null;
}

function defaultSelection(template: EditorTemplate): Selection | null {
  const section = template.sections[0];
  const item = section?.items[0];
  const field = item?.fields[0];
  if (section && item && field) {
    return { kind: "field", sectionId: section.id, itemId: item.id, fieldId: field.id };
  }
  if (section && item) return { kind: "item", sectionId: section.id, itemId: item.id };
  if (section) return { kind: "section", sectionId: section.id };
  return null;
}

export function TemplateWorkspace({
  template,
  initialFieldId,
}: {
  template: EditorTemplate;
  initialFieldId?: string;
}) {
  const router = useRouter();
  const [tree, setTree] = useState(template);
  const [selection, setSelection] = useState<Selection | null>(
    () => selectionFromFieldId(template, initialFieldId) ?? defaultSelection(template),
  );
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selection) return null;
    const section = findSection(tree, selection.sectionId);
    if (!section) return null;
    if (selection.kind === "section") return { kind: "section" as const, section };
    const item = findItem(section, selection.itemId);
    if (!item) return { kind: "section" as const, section };
    if (selection.kind === "item") return { kind: "item" as const, section, item };
    const field = item.fields.find((entry) => entry.id === selection.fieldId);
    if (!field) return { kind: "item" as const, section, item };
    return { kind: "field" as const, section, item, field };
  }, [selection, tree]);

  const selectedId =
    selected?.kind === "section"
      ? selected.section.id
      : selected?.kind === "item"
        ? selected.item.id
        : selected?.field.id ?? null;

  async function duplicate() {
    setDuplicating(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${tree.id}/duplicate`, {
        method: "POST",
      });
      const payload = (await response.json()) as { templateId?: string; error?: string };
      if (!response.ok || !payload.templateId) {
        setError(payload.error ?? "Could not duplicate.");
        return;
      }
      router.push(`/templates/${payload.templateId}`);
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 rounded-lg border border-line bg-surface lg:w-[360px]">
        <div className="border-b border-line px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Template</p>
          <h1 className="display mt-1 text-2xl leading-tight">{tree.name}</h1>
          <p className="mt-1 text-xs text-muted">{tree.sourceFilename}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void duplicate()}
              disabled={duplicating}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium disabled:opacity-60"
            >
              {duplicating ? "Duplicating…" : "Duplicate"}
            </button>
            <Link
              href={`/templates/${tree.id}/issues`}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium"
            >
              {tree.issues.length} import issue{tree.issues.length === 1 ? "" : "s"}
            </Link>
          </div>
          {error ? <p className="mt-2 text-xs text-defect">{error}</p> : null}
        </div>
        {tree.issues.length > 0 ? (
          <div className="border-b border-line bg-paper px-4 py-3 text-xs">
            <p className="font-medium">
              {tree.issues.length} import issue{tree.issues.length === 1 ? "" : "s"} recorded
            </p>
            <p className="mt-1 text-muted">
              Empty Spectora cells are missing from the export. Listed issues are present in
              the file but unsupported by this importer.
            </p>
            <Link href={`/templates/${tree.id}/issues`} className="mt-2 inline-block text-accent hover:underline">
              View issue details
            </Link>
          </div>
        ) : null}
        <TemplateTree
          template={tree}
          selectedId={selectedId}
          onSelectSection={(sectionId) => setSelection({ kind: "section", sectionId })}
          onSelectItem={(sectionId, itemId) => setSelection({ kind: "item", sectionId, itemId })}
          onSelectField={(sectionId, itemId, fieldId) =>
            setSelection({ kind: "field", sectionId, itemId, fieldId })
          }
        />
      </aside>
      <section className="min-w-0 flex-1 rounded-lg border border-line bg-surface p-5">
        <TemplateEditorPane
          selection={selected}
          onSectionRenamed={(id, name) => {
            setTree((current) => ({
              ...current,
              sections: current.sections.map((section) =>
                section.id === id ? { ...section, name } : section,
              ),
            }));
            router.refresh();
          }}
          onItemRenamed={(id, name) => {
            setTree((current) => ({
              ...current,
              sections: current.sections.map((section) => ({
                ...section,
                items: section.items.map((item) => (item.id === id ? { ...item, name } : item)),
              })),
            }));
            router.refresh();
          }}
          onFieldTextSaved={(id, textHtml) => {
            setTree((current) => ({
              ...current,
              sections: current.sections.map((section) => ({
                ...section,
                items: section.items.map((item) => ({
                  ...item,
                  fields: item.fields.map((field) =>
                    field.id === id ? { ...field, textHtml } : field,
                  ),
                })),
              })),
            }));
            router.refresh();
          }}
        />
      </section>
    </div>
  );
}
