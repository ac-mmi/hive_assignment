export function issueTrustKind(severity: string): "unsupported" | "warning" {
  return severity === "unsupported" ? "unsupported" : "warning";
}

export function issueTrustTitle(severity: string): string {
  return issueTrustKind(severity) === "unsupported"
    ? "Present in the Spectora export, but unsupported by this importer"
    : "Imported with a mapping warning";
}

export const MISSING_FROM_EXPORT_TITLE = "Missing from the Spectora export";

export const MISSING_FROM_EXPORT_NOTE =
  "Empty optional cells (comment text, category, photos, units, and similar) are not listed as failures. The source file did not contain that information.";

export const UNSUPPORTED_BY_IMPORTER_TITLE =
  "Present in the export but unsupported by our importer";

export const UNSUPPORTED_BY_IMPORTER_NOTE =
  "The source contained the information. This app stored it and listed the limitation so nothing disappears silently.";

export function graphImportStats(template: {
  issues: unknown[];
  sections: Array<{
    items: Array<{ name: string; fields: unknown[] }>;
  }>;
}) {
  const items = template.sections.flatMap((section) => section.items);
  const fields = items.flatMap((item) => item.fields);
  return {
    sectionCount: template.sections.length,
    itemCount: items.length,
    uniqueItemNameCount: new Set(items.map((item) => item.name)).size,
    fieldCount: fields.length,
    processedRows: fields.length,
    issueCount: template.issues.length,
  };
}

export function findGraphFieldBySourceRow(
  template: {
    sections: Array<{
      id: string;
      name: string;
      items: Array<{
        id: string;
        name: string;
        fields: Array<{ id: string; name: string; sourceRowNumber: number }>;
      }>;
    }>;
  },
  rowNumber: number | null,
) {
  if (rowNumber == null) return null;
  for (const section of template.sections) {
    for (const item of section.items) {
      for (const field of item.fields) {
        if (field.sourceRowNumber === rowNumber) {
          return {
            sectionId: section.id,
            sectionName: section.name,
            itemId: item.id,
            itemName: item.name,
            fieldId: field.id,
            fieldName: field.name,
          };
        }
      }
    }
  }
  return null;
}
