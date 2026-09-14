import { describe, expect, it } from "vitest";
import { COL } from "@/lib/importer/columns";
import { importSpectoraWorkbook, parseXlsxGrid } from "@/lib/importer/index";
import { decodeHtmlEntities } from "@/lib/importer/html";
import { splitCommaSeparated } from "@/lib/importer/options";
import { loadRealFixture } from "../helpers/fixture";

describe("semantic preservation against the real export", () => {
  it("keeps section/item/field names, text, types, options, and source order for every row", async () => {
    const fixture = loadRealFixture();
    const grid = await parseXlsxGrid(fixture.buffer);
    const imported = await importSpectoraWorkbook(fixture);

    const fields = imported.sections.flatMap((section) =>
      section.items.map((item) => ({ section: section.name, item: item.name, itemRef: item })),
    );

    expect(grid.rows).toHaveLength(392);

    for (const row of grid.rows) {
      const sectionName = decodeHtmlEntities(row.values[COL.sectionName] ?? "").trim();
      const itemName = decodeHtmlEntities(row.values[COL.itemName] ?? "").trim();
      const commentName = decodeHtmlEntities(row.values[COL.commentName] ?? "").trim();
      const rawText = row.values[COL.commentText] ?? "";
      const expectedText = rawText.trim() === "" ? null : rawText;

      const located = imported.sections
        .find((section) => section.name === sectionName)
        ?.items.find((item) => item.name === itemName)
        ?.fields.find((field) => field.sourceRowNumber === row.sourceRowNumber);

      expect(located, `missing imported field for Excel row ${row.sourceRowNumber}`).toBeTruthy();
      expect(located?.name).toBe(commentName);
      expect(located?.textHtml).toBe(expectedText);
      expect(located?.commentType).toBe((row.values[COL.commentType] ?? "").trim());
      expect(located?.answerType).toBe((row.values[COL.answerType] ?? "").trim());
      expect(located?.sourceOrder).toBe(Number.parseInt(row.values[COL.order] ?? "", 10));
      expect(located?.options.map((option) => option.label)).toEqual(
        splitCommaSeparated(row.values[COL.multipleChoice] ?? "").labels,
      );
      expect(located?.unitOptions.map((option) => option.label)).toEqual(
        splitCommaSeparated(row.values[COL.unitOptions] ?? "").labels,
      );
    }

    expect(fields.length).toBeGreaterThan(0);
  });
});
