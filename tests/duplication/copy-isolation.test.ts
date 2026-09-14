import { describe, expect, it } from "vitest";
import { duplicateTemplate } from "@/lib/duplication/duplicate-template";
import { persistImportedTemplate } from "@/lib/db/persist-import";
import { getTemplateGraph, type TemplateGraph } from "@/lib/db/queries";
import { renameItem, renameSection, updateFieldText } from "@/lib/db/updates";
import { importSpectoraWorkbook } from "@/lib/importer/index";
import { createTestDb } from "../helpers/db";
import { loadRealFixture } from "../helpers/fixture";

function collectIds(template: TemplateGraph): string[] {
  const ids = [template.id];
  for (const issue of template.issues) ids.push(issue.id);
  for (const section of template.sections) {
    ids.push(section.id);
    for (const item of section.items) {
      ids.push(item.id);
      for (const field of item.fields) {
        ids.push(field.id);
        for (const option of field.options) ids.push(option.id);
        for (const option of field.unitOptions) ids.push(option.id);
      }
    }
  }
  return ids;
}

describe("duplicate copy isolation", () => {
  it("duplicates the real InterNACHI graph with new IDs and keeps original edits isolated", async () => {
    const { db } = await createTestDb();
    const imported = await importSpectoraWorkbook(loadRealFixture());
    await persistImportedTemplate(db, imported);

    const original = await getTemplateGraph(db, imported.id);
    expect(original).toBeTruthy();

    const duplicated = await duplicateTemplate(db, imported.id);
    const copy = await getTemplateGraph(db, duplicated.templateId);
    expect(copy).toBeTruthy();
    expect(copy!.id).not.toBe(original!.id);
    expect(copy!.name).toBe(`${original!.name} (copy)`);
    expect(copy!.sourceFilename).toBe(original!.sourceFilename);

    const originalIds = new Set(collectIds(original!));
    const copyIds = collectIds(copy!);
    expect(copyIds).toHaveLength(originalIds.size);
    for (const id of copyIds) {
      expect(originalIds.has(id)).toBe(false);
    }

    expect(copy!.sections.map((section) => section.name)).toEqual(
      original!.sections.map((section) => section.name),
    );
    expect(copy!.sections.map((section) => section.position)).toEqual(
      original!.sections.map((section) => section.position),
    );
    expect(
      copy!.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.fields.map((field) => ({
            name: field.name,
            textHtml: field.textHtml,
            answerType: field.answerType,
            options: field.options.map((option) => option.label),
            units: field.unitOptions.map((option) => option.label),
            row: field.sourceRowNumber,
          })),
        ),
      ),
    ).toEqual(
      original!.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.fields.map((field) => ({
            name: field.name,
            textHtml: field.textHtml,
            answerType: field.answerType,
            options: field.options.map((option) => option.label),
            units: field.unitOptions.map((option) => option.label),
            row: field.sourceRowNumber,
          })),
        ),
      ),
    );

    const copySection = copy!.sections[0]!;
    const copyItem = copySection.items[0]!;
    const copyField = copyItem.fields[0]!;
    await renameSection(db, copySection.id, "Copy-only section");
    await renameItem(db, copyItem.id, "Copy-only item");
    await updateFieldText(db, copyField.id, "<p>Copy-only comment.</p>");

    const reloadedCopy = await getTemplateGraph(db, copy!.id);
    expect(reloadedCopy?.sections[0]?.name).toBe("Copy-only section");
    expect(reloadedCopy?.sections[0]?.items[0]?.name).toBe("Copy-only item");
    expect(reloadedCopy?.sections[0]?.items[0]?.fields[0]?.textHtml).toBe(
      "<p>Copy-only comment.</p>",
    );

    const reloadedOriginal = await getTemplateGraph(db, original!.id);
    expect(reloadedOriginal?.sections[0]?.name).toBe(original!.sections[0]?.name);
    expect(reloadedOriginal?.sections[0]?.items[0]?.name).toBe(original!.sections[0]?.items[0]?.name);
    expect(reloadedOriginal?.sections[0]?.items[0]?.fields[0]?.textHtml).toBe(
      original!.sections[0]?.items[0]?.fields[0]?.textHtml ?? null,
    );
    expect(reloadedOriginal?.sections[0]?.id).toBe(original!.sections[0]?.id);
  });
});
