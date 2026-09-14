import { randomUUID } from "node:crypto";
import type { AppDb } from "@/lib/db/persist-import";
import { persistImportedTemplate } from "@/lib/db/persist-import";
import { getTemplateGraph } from "@/lib/db/queries";
import type { ImportedTemplate } from "@/lib/importer/types";

function copyName(original: string): string {
  return original.endsWith(" (copy)") ? `${original} 2` : `${original} (copy)`;
}

/**
 * Deep-copy a template graph with new identities.
 * Child records are never shared with the original.
 */
export async function duplicateTemplate(
  db: AppDb,
  templateId: string,
): Promise<{ templateId: string }> {
  const original = await getTemplateGraph(db, templateId);
  if (!original) {
    throw new Error("Template not found.");
  }

  const copy: ImportedTemplate = {
    id: randomUUID(),
    name: copyName(original.name),
    sourceFormat: original.sourceFormat as "spectora-xlsx",
    sourceFilename: original.sourceFilename,
    issues: original.issues.map((entry) => ({
      id: randomUUID(),
      severity: entry.severity as ImportedTemplate["issues"][number]["severity"],
      rowNumber: entry.rowNumber,
      sourceColumn: entry.sourceColumn,
      message: entry.message,
      rawValue: entry.rawValue,
    })),
    sections: original.sections.map((section) => ({
      id: randomUUID(),
      name: section.name,
      description: section.description,
      position: section.position,
      items: section.items.map((item) => ({
        id: randomUUID(),
        name: item.name,
        position: item.position,
        fields: item.fields.map((field) => ({
          id: randomUUID(),
          name: field.name,
          textHtml: field.textHtml,
          commentType: field.commentType,
          category: field.category,
          answerType: field.answerType,
          position: field.position,
          sourceOrder: field.sourceOrder,
          sourceRowNumber: field.sourceRowNumber,
          defaultValue: field.defaultValue,
          defaultValue2: field.defaultValue2,
          defaultUnitType: field.defaultUnitType,
          defaultLocation: field.defaultLocation,
          estimateMin: field.estimateMin,
          estimateMax: field.estimateMax,
          locked: field.locked,
          simpleFormat: field.simpleFormat,
          disablePhotos: field.disablePhotos,
          uses: field.uses,
          recommendation: field.recommendation,
          sourceLastModified: field.sourceLastModified,
          photos: field.photosJson ?? [],
          supportStatus: field.supportStatus as "full" | "partial",
          options: field.options.map((option) => ({
            id: randomUUID(),
            label: option.label,
            position: option.position,
          })),
          unitOptions: field.unitOptions.map((option) => ({
            id: randomUUID(),
            label: option.label,
            position: option.position,
          })),
        })),
      })),
    })),
    summary: {
      rowsRead: 0,
      fieldsCreated: 0,
      silentlyDropped: 0,
      fullyImported: 0,
      partiallySupported: 0,
      warningCount: 0,
      unsupportedCount: 0,
      sectionCount: original.sections.length,
      itemCount: original.sections.reduce((sum, section) => sum + section.items.length, 0),
      uniqueItemNameCount: 0,
    },
  };

  return persistImportedTemplate(db, copy);
}
