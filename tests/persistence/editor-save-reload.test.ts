import { describe, expect, it } from "vitest";
import { persistImportedTemplate } from "@/lib/db/persist-import";
import { getTemplateGraph } from "@/lib/db/queries";
import { renameItem, renameSection, updateFieldText } from "@/lib/db/updates";
import { importSpectoraWorkbook } from "@/lib/importer/index";
import { createTestDb } from "../helpers/db";
import { loadRealFixture } from "../helpers/fixture";

function ids<T extends { id: string }>(rows: T[]): string[] {
  return rows.map((row) => row.id);
}

describe("template editor persistence", () => {
  it("reloads the imported InterNACHI hierarchy from the database, not mock data", async () => {
    const { db } = await createTestDb();
    const imported = await importSpectoraWorkbook(loadRealFixture());
    await persistImportedTemplate(db, imported);

    const loaded = await getTemplateGraph(db, imported.id);
    expect(loaded?.sourceFilename).toBe("InterNACHI Residential -2026-09-14.xls");
    expect(loaded?.sections.map((section) => section.name)).toEqual(
      imported.sections.map((section) => section.name),
    );
    expect(loaded?.sections.map((section) => section.position)).toEqual(
      imported.sections.map((section) => section.position),
    );
    expect(
      loaded?.sections.flatMap((section) =>
        section.items.map((item) => `${section.name}::${item.name}`),
      ),
    ).toEqual(
      imported.sections.flatMap((section) =>
        section.items.map((item) => `${section.name}::${item.name}`),
      ),
    );
    expect(
      loaded?.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.fields.map((field) => `${field.sourceRowNumber}:${field.name}`),
        ),
      ),
    ).toEqual(
      imported.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.fields.map((field) => `${field.sourceRowNumber}:${field.name}`),
        ),
      ),
    );
  });

  it("saves section, item, and comment edits and keeps them after a fresh reload", async () => {
    const { db } = await createTestDb();
    const imported = await importSpectoraWorkbook(loadRealFixture());
    await persistImportedTemplate(db, imported);

    const before = await getTemplateGraph(db, imported.id);
    expect(before).toBeTruthy();

    const section = before!.sections[0]!;
    const item = section.items[0]!;
    const field = item.fields[0]!;
    const laterSectionName = before!.sections[1]!.name;
    const sectionIds = ids(before!.sections);
    const itemIds = ids(section.items);
    const fieldIds = ids(item.fields);
    const originalFieldHtml = field.textHtml;

    expect(section.name).toBe("Inspection Details");
    expect(item.name).toBe("General");
    expect(field.name).toBe("In Attendance");

    const renamedSection = await renameSection(db, section.id, "Inspection Details (edited)");
    const renamedItem = await renameItem(db, item.id, "General (edited)");
    const editedField = await updateFieldText(
      db,
      field.id,
      "<p>Edited attendance note for persistence check.</p>",
    );
    expect(renamedSection?.name).toBe("Inspection Details (edited)");
    expect(renamedItem?.name).toBe("General (edited)");
    expect(editedField?.textHtml).toBe("<p>Edited attendance note for persistence check.</p>");

    const reloaded = await getTemplateGraph(db, imported.id);
    expect(reloaded?.sections[0]?.name).toBe("Inspection Details (edited)");
    expect(reloaded?.sections[0]?.items[0]?.name).toBe("General (edited)");
    expect(reloaded?.sections[0]?.items[0]?.fields[0]?.textHtml).toBe(
      "<p>Edited attendance note for persistence check.</p>",
    );
    expect(reloaded?.sections[1]?.name).toBe(laterSectionName);
    expect(ids(reloaded!.sections)).toEqual(sectionIds);
    expect(ids(reloaded!.sections[0]!.items)).toEqual(itemIds);
    expect(ids(reloaded!.sections[0]!.items[0]!.fields)).toEqual(fieldIds);
    expect(reloaded?.sections.map((entry) => entry.position)).toEqual(
      before!.sections.map((entry) => entry.position),
    );

    const reloadedAgain = await getTemplateGraph(db, imported.id);
    expect(reloadedAgain?.sections[0]?.name).toBe("Inspection Details (edited)");
    expect(reloadedAgain?.sections[0]?.items[0]?.name).toBe("General (edited)");
    expect(reloadedAgain?.sections[0]?.items[0]?.fields[0]?.textHtml).toBe(
      "<p>Edited attendance note for persistence check.</p>",
    );
    expect(reloadedAgain?.sections[0]?.items[0]?.fields[0]?.textHtml).not.toBe(originalFieldHtml);
    expect(ids(reloadedAgain!.sections)).toEqual(sectionIds);
  });

  it("returns null for unknown records instead of inventing rows", async () => {
    const { db } = await createTestDb();
    const missing = "00000000-0000-4000-8000-000000000000";
    expect(await renameSection(db, missing, "Nope")).toBeNull();
    expect(await renameItem(db, missing, "Nope")).toBeNull();
    expect(await updateFieldText(db, missing, "<p>Nope</p>")).toBeNull();
  });
});
