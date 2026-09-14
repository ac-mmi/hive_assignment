import ExcelJS from "exceljs";
import { FatalImportError } from "./fatal";
import type { SpreadsheetGrid, SpreadsheetRow } from "./types";

function cellToPlainText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
    if ("result" in value) {
      return cellToPlainText(value.result as ExcelJS.CellValue);
    }
    if ("hyperlink" in value && "text" in value) {
      return String(value.text ?? "");
    }
  }
  return String(value);
}

function isRowEmpty(values: Record<string, string>): boolean {
  return Object.values(values).every((value) => value.trim() === "");
}

/**
 * Read an OOXML workbook by cell address/column number.
 * Empty cells are omitted from the XML; never zip values sequentially.
 */
export async function parseXlsxGrid(buffer: Buffer): Promise<SpreadsheetGrid> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new FatalImportError(`The xlsx workbook could not be parsed: ${message}`);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new FatalImportError("The workbook does not contain a worksheet.");
  }

  const headerRow = worksheet.getRow(1);
  const headerToColumn = new Map<string, number>();
  const headers: string[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const title = cellToPlainText(cell.value).trim();
    if (!title) return;
    headerToColumn.set(title, colNumber);
    headers.push(title);
  });

  if (headers.length === 0) {
    throw new FatalImportError("The first worksheet row does not contain column headers.");
  }

  const rows: SpreadsheetRow[] = [];
  const lastRow = worksheet.rowCount;

  for (let sourceRowNumber = 2; sourceRowNumber <= lastRow; sourceRowNumber += 1) {
    const excelRow = worksheet.getRow(sourceRowNumber);
    const values: Record<string, string> = {};
    for (const [header, colNumber] of headerToColumn) {
      values[header] = cellToPlainText(excelRow.getCell(colNumber).value);
    }
    if (isRowEmpty(values)) continue;
    rows.push({ sourceRowNumber, values });
  }

  return {
    sheetName: worksheet.name,
    headers,
    headerToColumn,
    rows,
  };
}
