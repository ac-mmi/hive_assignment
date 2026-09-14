import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SOURCE_COLUMNS } from "@/lib/importer/columns";
import { importSpectoraWorkbook } from "@/lib/importer/index";

async function workbookBuffer(rows: Array<Record<string, string>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow([...SOURCE_COLUMNS]);
  for (const row of rows) {
    sheet.addRow(SOURCE_COLUMNS.map((column) => row[column] ?? ""));
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("generic Spectora column structure", () => {
  it("imports a second workbook with the same headers and different names", async () => {
    // Labeled structure check only. A second real Spectora customer export was not supplied.
    const buffer = await workbookBuffer([
      {
        "Section Name": "Alpha Custom Section",
        "Item Name": "Custom Item One",
        "Comment Name": "First comment",
        "Comment Text": "<p>Alpha text</p>",
        "Comment Type (info, limit, defect)": "info",
        "Order (w/i item)": "0",
        "Answer Type (boolean, checkbox, date, number, range, text)": "text",
      },
      {
        "Section Name": "Beta Other Section",
        "Item Name": "Custom Item Two",
        "Comment Name": "Second comment",
        "Comment Text": "",
        "Comment Type (info, limit, defect)": "defect",
        "Category (-1: Low, 0: Med, 1: High)": "1",
        "Multiple Choice Options (comma-separated)": "Red, Blue",
        "Order (w/i item)": "0",
        "Answer Type (boolean, checkbox, date, number, range, text)": "checkbox",
      },
    ]);

    const imported = await importSpectoraWorkbook({
      buffer,
      filename: "labeled-alternate-structure.xlsx",
    });

    expect(imported.summary.rowsRead).toBe(2);
    expect(imported.summary.silentlyDropped).toBe(0);
    expect(imported.sections.map((section) => section.name)).toEqual([
      "Alpha Custom Section",
      "Beta Other Section",
    ]);
    expect(imported.sections[1]?.items[0]?.fields[0]?.options.map((option) => option.label)).toEqual([
      "Red",
      "Blue",
    ]);
    expect(imported.sections[0]?.items[0]?.fields[0]?.textHtml).toBe("<p>Alpha text</p>");
  });
});
