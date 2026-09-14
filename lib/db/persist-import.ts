import type { PgliteDatabase } from "drizzle-orm/pglite";
import {
  fieldOptions,
  fields,
  fieldUnitOptions,
  importIssues,
  items,
  schema,
  sections,
  templates,
} from "@/lib/db/schema";
import type { Database } from "@/lib/db/index";
import type { ImportedTemplate } from "@/lib/importer/types";

export type AppDb = Database | PgliteDatabase<typeof schema>;

export async function persistImportedTemplate(
  db: AppDb,
  imported: ImportedTemplate,
): Promise<{ templateId: string }> {
  await db.transaction(async (tx) => {
    await tx.insert(templates).values({
      id: imported.id,
      name: imported.name,
      sourceFormat: imported.sourceFormat,
      sourceFilename: imported.sourceFilename,
    });

    if (imported.sections.length > 0) {
      await tx.insert(sections).values(
        imported.sections.map((section) => ({
          id: section.id,
          templateId: imported.id,
          name: section.name,
          description: section.description,
          position: section.position,
        })),
      );
    }

    const itemRows = imported.sections.flatMap((section) =>
      section.items.map((item) => ({
        id: item.id,
        sectionId: section.id,
        name: item.name,
        position: item.position,
      })),
    );
    if (itemRows.length > 0) {
      await tx.insert(items).values(itemRows);
    }

    const fieldRows = imported.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.fields.map((field) => ({
          id: field.id,
          itemId: item.id,
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
          photosJson: field.photos,
          supportStatus: field.supportStatus,
        })),
      ),
    );
    if (fieldRows.length > 0) {
      await tx.insert(fields).values(fieldRows);
    }

    const optionRows = imported.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.fields.flatMap((field) =>
          field.options.map((option) => ({
            id: option.id,
            fieldId: field.id,
            label: option.label,
            position: option.position,
          })),
        ),
      ),
    );
    if (optionRows.length > 0) {
      await tx.insert(fieldOptions).values(optionRows);
    }

    const unitRows = imported.sections.flatMap((section) =>
      section.items.flatMap((item) =>
        item.fields.flatMap((field) =>
          field.unitOptions.map((option) => ({
            id: option.id,
            fieldId: field.id,
            label: option.label,
            position: option.position,
          })),
        ),
      ),
    );
    if (unitRows.length > 0) {
      await tx.insert(fieldUnitOptions).values(unitRows);
    }

    if (imported.issues.length > 0) {
      await tx.insert(importIssues).values(
        imported.issues.map((entry) => ({
          id: entry.id,
          templateId: imported.id,
          severity: entry.severity,
          rowNumber: entry.rowNumber,
          sourceColumn: entry.sourceColumn,
          message: entry.message,
          rawValue: entry.rawValue,
        })),
      );
    }
  });

  return { templateId: imported.id };
}
