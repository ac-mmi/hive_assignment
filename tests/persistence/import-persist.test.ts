import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { persistImportedTemplate } from "@/lib/db/persist-import";
import { getTemplateGraph } from "@/lib/db/queries";
import { fields, items } from "@/lib/db/schema";
import { duplicateTemplate } from "@/lib/duplication/duplicate-template";
import { importSpectoraWorkbook } from "@/lib/importer/index";
import { createTestDb } from "../helpers/db";
import { loadRealFixture } from "../helpers/fixture";

describe("persistence and duplication", () => {
  it("persists the real fixture, reloads it, and keeps duplicate edits independent", async () => {
    const { db } = await createTestDb();
    const imported = await importSpectoraWorkbook(loadRealFixture());
    await persistImportedTemplate(db, imported);

    const loaded = await getTemplateGraph(db, imported.id);
    expect(loaded).toBeTruthy();
    expect(loaded?.sections).toHaveLength(13);
    expect(loaded?.sections.flatMap((section) => section.items)).toHaveLength(69);
    expect(
      loaded?.sections.flatMap((section) => section.items.flatMap((item) => item.fields)),
    ).toHaveLength(392);

    const youtube = loaded?.sections
      .flatMap((section) => section.items.flatMap((item) => item.fields))
      .find((field) => field.sourceRowNumber === 311);
    expect(youtube?.textHtml).toContain("youtube-embed-wrapper");
    expect(loaded?.issues.some((issue) => issue.rowNumber === 311)).toBe(true);

    const originalItem = loaded?.sections[0]?.items[0];
    expect(originalItem).toBeTruthy();

    const duplicated = await duplicateTemplate(db, imported.id);
    expect(duplicated.templateId).not.toBe(imported.id);

    const copy = await getTemplateGraph(db, duplicated.templateId);
    expect(copy?.sections).toHaveLength(13);
    expect(copy?.id).not.toBe(imported.id);
    expect(copy?.sections[0]?.id).not.toBe(loaded?.sections[0]?.id);
    expect(copy?.sections[0]?.items[0]?.id).not.toBe(originalItem?.id);

    const copiedItemId = copy?.sections[0]?.items[0]?.id;
    expect(copiedItemId).toBeTruthy();
    await db
      .update(items)
      .set({ name: "Renamed only on copy" })
      .where(eq(items.id, copiedItemId!));

    const originalField = loaded?.sections
      .flatMap((section) => section.items.flatMap((item) => item.fields))
      .find((field) => field.sourceRowNumber === 12);
    const copiedFieldId = copy?.sections
      .flatMap((section) => section.items.flatMap((item) => item.fields))
      .find((field) => field.sourceRowNumber === 12)?.id;
    expect(copiedFieldId).toBeTruthy();
    await db
      .update(fields)
      .set({ textHtml: "<p>Edited only on the copy.</p>" })
      .where(eq(fields.id, copiedFieldId!));

    const originalAfter = await getTemplateGraph(db, imported.id);
    const copyAfter = await getTemplateGraph(db, duplicated.templateId);
    expect(originalAfter?.sections[0]?.items[0]?.name).toBe(originalItem?.name);
    expect(copyAfter?.sections[0]?.items[0]?.name).toBe("Renamed only on copy");
    expect(originalField?.textHtml).toContain("Siding showed signs of water intrusion");
    expect(
      copyAfter?.sections
        .flatMap((section) => section.items.flatMap((item) => item.fields))
        .find((field) => field.id === copiedFieldId)?.textHtml,
    ).toBe("<p>Edited only on the copy.</p>");
    expect(
      originalAfter?.sections
        .flatMap((section) => section.items.flatMap((item) => item.fields))
        .find((field) => field.sourceRowNumber === 12)?.textHtml,
    ).toContain("Siding showed signs of water intrusion");
  });
});
