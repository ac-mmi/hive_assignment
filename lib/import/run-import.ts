import { persistImportedTemplate, type AppDb } from "@/lib/db/persist-import";
import {
  importSpectoraWorkbook,
  type ImportWorkbookInput,
  type ImportedTemplate,
} from "@/lib/importer";

/**
 * Single path used by seed and the upload API:
 * sniff → parse-by-cell-address → map → validate → transactional persist.
 */
export async function runImport(
  db: AppDb,
  input: ImportWorkbookInput,
): Promise<ImportedTemplate> {
  const imported = await importSpectoraWorkbook(input);
  await persistImportedTemplate(db, imported);
  return imported;
}
