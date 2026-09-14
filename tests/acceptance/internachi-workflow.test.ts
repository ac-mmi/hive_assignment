import { describe, expect, it } from "vitest";
import { duplicateTemplate } from "@/lib/duplication/duplicate-template";
import { runImport } from "@/lib/import/run-import";
import { getTemplateGraph } from "@/lib/db/queries";
import { renameItem, renameSection, updateFieldText } from "@/lib/db/updates";
import { COL } from "@/lib/importer/columns";
import { findGraphFieldBySourceRow, graphImportStats } from "@/lib/import-trust";
import { createTestDb } from "../helpers/db";
import { loadRealFixture } from "../helpers/fixture";

describe("Internachi acceptance workflow", () => {
  it("imports, persists, edits, reloads, duplicates, and keeps the original unchanged", async () => {
    const { db } = await createTestDb();
    const imported = await runImport(db, loadRealFixture());

    expect(imported.summary.silentlyDropped).toBe(0);
    expect(imported.issues).toHaveLength(1);
    expect(imported.issues[0]?.rowNumber).toBe(311);
    expect(imported.issues[0]?.severity).toBe("unsupported");
    expect(imported.issues[0]?.sourceColumn).toBe(COL.commentText);

    const opened = await getTemplateGraph(db, imported.id);
    expect(opened?.sections).toHaveLength(imported.sections.length);
    expect(opened?.sections[0]?.name).toBe(imported.sections[0]?.name);
    expect(opened?.issues).toHaveLength(1);
    expect(graphImportStats(opened!).issueCount).toBe(1);
    expect(findGraphFieldBySourceRow(opened!, 311)?.fieldName).toBe("Doorknob Hole");

    const section = opened!.sections[0]!;
    const item = section.items[0]!;
    const field = item.fields[0]!;
    await renameSection(db, section.id, "Edited section");
    await renameItem(db, item.id, "Edited item");
    await updateFieldText(db, field.id, "<p>Edited comment after save.</p>");

    const afterSave = await getTemplateGraph(db, imported.id);
    expect(afterSave?.sections[0]?.name).toBe("Edited section");
    expect(afterSave?.sections[0]?.items[0]?.name).toBe("Edited item");
    expect(afterSave?.sections[0]?.items[0]?.fields[0]?.textHtml).toBe(
      "<p>Edited comment after save.</p>",
    );

    const duplicated = await duplicateTemplate(db, imported.id);
    const copy = await getTemplateGraph(db, duplicated.templateId);
    expect(copy?.sections[0]?.name).toBe("Edited section");
    await renameSection(db, copy!.sections[0]!.id, "Duplicate section only");
    await renameItem(db, copy!.sections[0]!.items[0]!.id, "Duplicate item only");
    await updateFieldText(
      db,
      copy!.sections[0]!.items[0]!.fields[0]!.id,
      "<p>Duplicate comment only.</p>",
    );

    const reloadedCopy = await getTemplateGraph(db, duplicated.templateId);
    const reloadedOriginal = await getTemplateGraph(db, imported.id);
    expect(reloadedCopy?.sections[0]?.name).toBe("Duplicate section only");
    expect(reloadedCopy?.sections[0]?.items[0]?.name).toBe("Duplicate item only");
    expect(reloadedCopy?.sections[0]?.items[0]?.fields[0]?.textHtml).toBe(
      "<p>Duplicate comment only.</p>",
    );
    expect(reloadedOriginal?.sections[0]?.name).toBe("Edited section");
    expect(reloadedOriginal?.sections[0]?.items[0]?.name).toBe("Edited item");
    expect(reloadedOriginal?.sections[0]?.items[0]?.fields[0]?.textHtml).toBe(
      "<p>Edited comment after save.</p>",
    );
    expect(reloadedOriginal?.issues[0]?.rowNumber).toBe(311);
    expect(reloadedCopy?.issues[0]?.id).not.toBe(reloadedOriginal?.issues[0]?.id);
  });
});
