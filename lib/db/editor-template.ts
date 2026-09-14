import type { EditorTemplate } from "@/components/template-editor/types";
import type { TemplateGraph } from "@/lib/db/queries";

/**
 * Map a persisted template graph into editor props.
 * Names, order, and HTML come from the database — never from fixtures in the UI.
 */
export function toEditorTemplate(template: TemplateGraph): EditorTemplate {
  return {
    id: template.id,
    name: template.name,
    sourceFilename: template.sourceFilename,
    issues: template.issues.map((issue) => ({
      id: issue.id,
      severity: issue.severity,
      rowNumber: issue.rowNumber,
      sourceColumn: issue.sourceColumn,
      message: issue.message,
      rawValue: issue.rawValue,
    })),
    sections: template.sections.map((section) => ({
      id: section.id,
      name: section.name,
      position: section.position,
      items: section.items.map((item) => ({
        id: item.id,
        name: item.name,
        position: item.position,
        fields: item.fields.map((field) => ({
          id: field.id,
          name: field.name,
          textHtml: field.textHtml,
          commentType: field.commentType,
          answerType: field.answerType,
          position: field.position,
          sourceOrder: field.sourceOrder,
          sourceRowNumber: field.sourceRowNumber,
          supportStatus: field.supportStatus,
          recommendation: field.recommendation,
          options: field.options.map((option) => ({
            id: option.id,
            label: option.label,
            position: option.position,
          })),
          unitOptions: field.unitOptions.map((option) => ({
            id: option.id,
            label: option.label,
            position: option.position,
          })),
        })),
      })),
    })),
  };
}
