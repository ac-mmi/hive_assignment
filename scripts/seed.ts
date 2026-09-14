import { readFileSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db";
import { templates } from "../lib/db/schema";
import { runImport } from "../lib/import/run-import";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();

  const filename = "InterNACHI Residential -2026-09-14.xls";
  const fixturePath = path.join(process.cwd(), "fixtures", filename);
  const db = getDb();

  const existing = await db.query.templates.findFirst({
    where: eq(templates.sourceFilename, filename),
  });

  if (existing) {
    console.log(`Seed skipped; template already imported as ${existing.id}`);
    process.exit(0);
  }

  const imported = await runImport(db, {
    buffer: readFileSync(fixturePath),
    filename,
  });
  console.log(
    `Seeded template ${imported.id} (${imported.summary.fieldsCreated} fields, ${imported.summary.sectionCount} sections, ${imported.summary.itemCount} items, ${imported.issues.length} issues).`,
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
