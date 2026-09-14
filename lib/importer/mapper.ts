import { randomUUID } from "node:crypto";
import { COL, REQUIRED_HEADERS, SOURCE_COLUMNS, type SourceColumn } from "./columns";
import { FatalImportError } from "./fatal";
import { decodeHtmlEntities, inspectCommentHtml } from "./html";
import { splitCommaSeparated } from "./options";
import type {
  ImportIssue,
  ImportedField,
  ImportedItem,
  ImportedOption,
  ImportedSection,
  ImportedTemplate,
  IssueSeverity,
  PhotoSlot,
  SpreadsheetGrid,
} from "./types";
import {
  blankToNull,
  isKnownAnswerType,
  isKnownCommentType,
  parseCategory,
  parseIntegerField,
} from "./validator";

function templateNameFromFilename(filename: string): string {
  const trimmed = filename.trim();
  const withoutExt = trimmed.replace(/\.(xlsx|xls)$/i, "").trim();
  return withoutExt || trimmed || "Imported template";
}

function issue(input: {
  severity: IssueSeverity;
  rowNumber: number | null;
  sourceColumn: string | null;
  message: string;
  rawValue: string | null;
}): ImportIssue {
  return { id: randomUUID(), ...input };
}

function cell(row: Record<string, string>, column: SourceColumn): string {
  return row[column] ?? "";
}

function nullableText(raw: string): string | null {
  return blankToNull(raw);
}

function mapPhotos(row: Record<string, string>): PhotoSlot[] {
  const slots: PhotoSlot[] = [];
  for (let index = 1; index <= 10; index += 1) {
    const photo = (row[`Default Photo ${index}`] ?? "").trim();
    const caption = (row[`Default Photo ${index} Caption`] ?? "").trim();
    if (!photo && !caption) continue;
    slots.push({
      index,
      photo: photo || null,
      caption: caption || null,
    });
  }
  return slots;
}

function toOptions(labels: string[]): ImportedOption[] {
  return labels.map((label, position) => ({
    id: randomUUID(),
    label,
    position,
  }));
}

export function mapGridToTemplate(input: {
  grid: SpreadsheetGrid;
  filename: string;
}): ImportedTemplate {
  const { grid, filename } = input;
  const issues: ImportIssue[] = [];

  const missingRequired = REQUIRED_HEADERS.filter((header) => !grid.headerToColumn.has(header));
  if (missingRequired.length > 0) {
    throw new FatalImportError(
      `The spreadsheet is missing required Spectora columns: ${missingRequired.join(", ")}.`,
    );
  }

  for (const header of SOURCE_COLUMNS) {
    if (!grid.headerToColumn.has(header)) {
      issues.push(
        issue({
          severity: "warning",
          rowNumber: 1,
          sourceColumn: header,
          message:
            "This Spectora column is absent from the header row. Values will be treated as missing from the export, not dropped after being read.",
          rawValue: null,
        }),
      );
    }
  }

  const sections: ImportedSection[] = [];
  const sectionByName = new Map<string, ImportedSection>();
  const itemByKey = new Map<string, ImportedItem>();

  for (const row of grid.rows) {
    const values = row.values;
    const rowNumber = row.sourceRowNumber;
    let supportStatus: ImportedField["supportStatus"] = "full";

    const rawSection = cell(values, COL.sectionName);
    const rawItem = cell(values, COL.itemName);
    const rawComment = cell(values, COL.commentName);
    const rawText = cell(values, COL.commentText);
    const rawCommentType = cell(values, COL.commentType).trim();
    const rawAnswerType = cell(values, COL.answerType).trim();
    const rawCategory = cell(values, COL.category);
    const rawOrder = cell(values, COL.order);
    const rawMin = cell(values, COL.estimateMin);
    const rawMax = cell(values, COL.estimateMax);
    const rawMultiple = cell(values, COL.multipleChoice);
    const rawUnits = cell(values, COL.unitOptions);

    let sectionName = decodeHtmlEntities(rawSection).trim();
    if (!sectionName) {
      sectionName = "Untitled section";
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.sectionName,
          message:
            "Section Name is missing. The row was imported under a generated fallback name so it was not silently dropped.",
          rawValue: rawSection,
        }),
      );
      supportStatus = "partial";
    }

    let itemName = decodeHtmlEntities(rawItem).trim();
    if (!itemName) {
      itemName = "Untitled item";
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.itemName,
          message:
            "Item Name is missing. The row was imported under a generated fallback name so it was not silently dropped.",
          rawValue: rawItem,
        }),
      );
      supportStatus = "partial";
    }

    let commentName = decodeHtmlEntities(rawComment).trim();
    if (!commentName) {
      commentName = `Untitled comment (row ${rowNumber})`;
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.commentName,
          message:
            "Comment Name is missing. The row was imported with a generated fallback name so it was not silently dropped.",
          rawValue: rawComment,
        }),
      );
      supportStatus = "partial";
    }

    let section = sectionByName.get(sectionName);
    if (!section) {
      section = {
        id: randomUUID(),
        name: sectionName,
        description: null,
        position: sections.length,
        items: [],
      };
      sectionByName.set(sectionName, section);
      sections.push(section);
    }

    const itemKey = `${section.id}\0${itemName}`;
    let item = itemByKey.get(itemKey);
    if (!item) {
      item = {
        id: randomUUID(),
        name: itemName,
        position: section.items.length,
        fields: [],
      };
      itemByKey.set(itemKey, item);
      section.items.push(item);
    }

    let commentType = rawCommentType;
    if (!commentType) {
      commentType = "unknown";
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.commentType,
          message: "Comment Type is missing. The field was imported with type 'unknown'.",
          rawValue: rawCommentType,
        }),
      );
      supportStatus = "partial";
    } else if (!isKnownCommentType(commentType)) {
      issues.push(
        issue({
          severity: "unsupported",
          rowNumber,
          sourceColumn: COL.commentType,
          message: `Comment Type '${commentType}' is not one of info, limit, defect. The source value was preserved and not converted.`,
          rawValue: rawCommentType,
        }),
      );
      supportStatus = "partial";
    }

    let answerType = rawAnswerType;
    if (!answerType) {
      answerType = "unknown";
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.answerType,
          message: "Answer Type is missing. The field was imported with type 'unknown'.",
          rawValue: rawAnswerType,
        }),
      );
      supportStatus = "partial";
    } else if (!isKnownAnswerType(answerType)) {
      issues.push(
        issue({
          severity: "unsupported",
          rowNumber,
          sourceColumn: COL.answerType,
          message: `Answer Type '${answerType}' is not a recognized Spectora type. The source value was preserved and not converted.`,
          rawValue: rawAnswerType,
        }),
      );
      supportStatus = "partial";
    }

    const categoryParsed = parseCategory(rawCategory);
    if (categoryParsed.invalid) {
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.category,
          message: "Category is not one of -1, 0, 1. The invalid value was not stored as a category.",
          rawValue: rawCategory,
        }),
      );
    }

    const orderParsed = parseIntegerField(rawOrder);
    if (orderParsed.invalid) {
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.order,
          message:
            "Order (w/i item) is not an integer. First-seen source row order is used for position instead.",
          rawValue: rawOrder,
        }),
      );
    }

    const minParsed = parseIntegerField(rawMin);
    if (minParsed.invalid) {
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.estimateMin,
          message: "Default Estimate Min is not a valid integer.",
          rawValue: rawMin,
        }),
      );
    }
    const maxParsed = parseIntegerField(rawMax);
    if (maxParsed.invalid) {
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.estimateMax,
          message: "Default Estimate Max is not a valid integer.",
          rawValue: rawMax,
        }),
      );
    }

    const multiple = splitCommaSeparated(rawMultiple);
    if (multiple.malformed) {
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.multipleChoice,
          message:
            "Multiple Choice Options contained an empty segment. Non-empty labels were kept in listed order.",
          rawValue: rawMultiple,
        }),
      );
    }

    const units = splitCommaSeparated(rawUnits);
    if (units.malformed) {
      issues.push(
        issue({
          severity: "warning",
          rowNumber,
          sourceColumn: COL.unitOptions,
          message:
            "Unit Type Options contained an empty segment. Non-empty labels were kept in listed order.",
          rawValue: rawUnits,
        }),
      );
    }

    const textHtml = rawText.trim() === "" ? null : rawText;
    if (textHtml) {
      const html = inspectCommentHtml(textHtml);
      if (html.unsupported.length > 0) {
        issues.push(
          issue({
            severity: "unsupported",
            rowNumber,
            sourceColumn: COL.commentText,
            message: `Comment Text contains HTML that this importer cannot safely render yet (${html.unsupported.join(", ")}). The original HTML is preserved on the field; it was not silently dropped.`,
            rawValue: textHtml,
          }),
        );
        supportStatus = "partial";
      }
    }

    const field: ImportedField = {
      id: randomUUID(),
      name: commentName,
      textHtml,
      commentType,
      category: categoryParsed.invalid ? null : categoryParsed.value,
      answerType,
      position: item.fields.length,
      sourceOrder: orderParsed.invalid ? null : orderParsed.value,
      sourceRowNumber: rowNumber,
      defaultValue: nullableText(cell(values, COL.defaultValue)),
      defaultValue2: nullableText(cell(values, COL.defaultValue2)),
      defaultUnitType: nullableText(cell(values, COL.defaultUnitType)),
      defaultLocation: nullableText(cell(values, COL.defaultLocation)),
      estimateMin: minParsed.invalid ? null : minParsed.value,
      estimateMax: maxParsed.invalid ? null : maxParsed.value,
      locked: nullableText(cell(values, COL.locked)),
      simpleFormat: nullableText(cell(values, COL.simpleFormat)),
      disablePhotos: nullableText(cell(values, COL.disablePhotos)),
      uses: nullableText(cell(values, COL.uses)),
      recommendation: nullableText(cell(values, COL.recommendation)),
      sourceLastModified: nullableText(cell(values, COL.lastModified)),
      photos: mapPhotos(values),
      supportStatus,
      options: toOptions(multiple.labels),
      unitOptions: toOptions(units.labels),
    };

    item.fields.push(field);
  }

  const itemCount = sections.reduce((sum, section) => sum + section.items.length, 0);
  const uniqueItemNames = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) uniqueItemNames.add(item.name);
  }
  const fields = sections.flatMap((section) => section.items.flatMap((item) => item.fields));
  const fullyImported = fields.filter((field) => field.supportStatus === "full").length;
  const partiallySupported = fields.filter((field) => field.supportStatus === "partial").length;

  return {
    id: randomUUID(),
    name: templateNameFromFilename(filename),
    sourceFormat: "spectora-xlsx",
    sourceFilename: filename,
    sections,
    issues,
    summary: {
      rowsRead: grid.rows.length,
      fieldsCreated: fields.length,
      silentlyDropped: grid.rows.length - fields.length,
      fullyImported,
      partiallySupported,
      warningCount: issues.filter((entry) => entry.severity === "warning").length,
      unsupportedCount: issues.filter((entry) => entry.severity === "unsupported").length,
      sectionCount: sections.length,
      itemCount,
      uniqueItemNameCount: uniqueItemNames.size,
    },
  };
}
