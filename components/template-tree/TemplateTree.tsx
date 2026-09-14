"use client";

import type { EditorTemplate } from "@/components/template-editor/types";

function TypeBadge({ value }: { value: string }) {
  const tone =
    value === "defect"
      ? "text-defect"
      : value === "limit"
        ? "text-limit"
        : value === "info"
          ? "text-info"
          : "text-muted";
  return <span className={`text-[11px] uppercase tracking-wide ${tone}`}>{value}</span>;
}

export function TemplateTree({
  template,
  selectedId,
  onSelectSection,
  onSelectItem,
  onSelectField,
}: {
  template: EditorTemplate;
  selectedId: string | null;
  onSelectSection: (sectionId: string) => void;
  onSelectItem: (sectionId: string, itemId: string) => void;
  onSelectField: (sectionId: string, itemId: string, fieldId: string) => void;
}) {
  return (
    <div className="max-h-[calc(100vh-220px)] overflow-auto px-2 py-3 text-sm">
      {template.sections.map((section) => (
        <div key={section.id} className="mb-2">
          <button
            type="button"
            onClick={() => onSelectSection(section.id)}
            className={`w-full rounded px-2 py-1.5 text-left font-medium ${
              selectedId === section.id ? "bg-accent-soft" : "hover:bg-paper"
            }`}
          >
            {section.name}
          </button>
          <div className="ml-3 border-l border-line pl-2">
            {section.items.map((item) => (
              <div key={item.id} className="mt-1">
                <button
                  type="button"
                  onClick={() => onSelectItem(section.id, item.id)}
                  className={`w-full rounded px-2 py-1 text-left ${
                    selectedId === item.id ? "bg-accent-soft" : "hover:bg-paper"
                  }`}
                >
                  {item.name}
                </button>
                <ul className="ml-2">
                  {item.fields.map((field) => (
                    <li key={field.id}>
                      <button
                        type="button"
                        onClick={() => onSelectField(section.id, item.id, field.id)}
                        className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left ${
                          selectedId === field.id ? "bg-accent-soft" : "hover:bg-paper"
                        }`}
                      >
                        <span className="truncate">{field.name}</span>
                        <TypeBadge value={field.commentType} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
