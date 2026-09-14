import { FatalImportError } from "./fatal";
import { mapGridToTemplate } from "./mapper";
import { parseXlsxGrid } from "./parse-xlsx";
import { describeUnsupportedKind, sniffSpreadsheet } from "./sniff";
import type { ImportedTemplate } from "./types";

export type ImportWorkbookInput = {
  buffer: Buffer;
  filename: string;
};

/**
 * Sniff → parse-by-cell-address → map → validate.
 * Returns a structured template plus explicit import issues.
 */
export async function importSpectoraWorkbook(
  input: ImportWorkbookInput,
): Promise<ImportedTemplate> {
  if (!input.buffer.length) {
    throw new FatalImportError("The uploaded file is empty.");
  }

  const kind = sniffSpreadsheet(input.buffer);
  if (kind !== "xlsx") {
    throw new FatalImportError(describeUnsupportedKind(kind));
  }

  const grid = await parseXlsxGrid(input.buffer);
  return mapGridToTemplate({ grid, filename: input.filename });
}

export { FatalImportError } from "./fatal";
export { inspectCommentHtml, isCommentHtmlEmpty, sanitizeCommentHtml } from "./html";
export { parseXlsxGrid } from "./parse-xlsx";
export { sniffSpreadsheet } from "./sniff";
export type { ImportedTemplate, ImportSummary, ImportIssue } from "./types";
