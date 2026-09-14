import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SOURCE_COLUMNS } from "@/lib/importer/columns";
import { FatalImportError, importSpectoraWorkbook } from "@/lib/importer/index";

async function workbookBuffer(rows: Array<Record<string, string>>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow([...SOURCE_COLUMNS]);
  for (const row of rows) {
    sheet.addRow(SOURCE_COLUMNS.map((column) => row[column] ?? ""));
  }
  const raw = await workbook.xlsx.writeBuffer();
  return Buffer.from(raw);
}

const baseRow = {
  "Section Name": "Roof",
  "Item Name": "Coverings",
  "Comment Name": "Condition",
  "Comment Text": "<p>Looks worn.</p>",
  "Comment Type (info, limit, defect)": "defect",
  "Category (-1: Low, 0: Med, 1: High)": "0",
  "Order (w/i item)": "0",
  "Answer Type (boolean, checkbox, date, number, range, text)": "boolean",
  "Default Estimate Min": "10",
  "Default Estimate Max": "1000",
  Uses: "0",
};

describe("malformed and unsupported rows", () => {
  it("imports bad rows with issues instead of aborting or dropping them", async () => {
    const buffer = await workbookBuffer([
      baseRow,
      {
        ...baseRow,
        "Comment Name": "Unknown type",
        "Comment Type (info, limit, defect)": "mystery",
        "Answer Type (boolean, checkbox, date, number, range, text)": "widget",
        "Order (w/i item)": "n/a",
        "Default Estimate Min": "abc",
        "Multiple Choice Options (comma-separated)": "Yes,,No",
      },
      {
        ...baseRow,
        "Section Name": "",
        "Item Name": "",
        "Comment Name": "",
        "Comment Text": '<div onclick="alert(1)">bad</div>',
      },
    ]);

    const imported = await importSpectoraWorkbook({
      buffer,
      filename: "labeled-malformed-test.xlsx",
    });

    expect(imported.summary.rowsRead).toBe(3);
    expect(imported.summary.fieldsCreated).toBe(3);
    expect(imported.summary.silentlyDropped).toBe(0);
    expect(imported.summary.partiallySupported).toBe(2);
    expect(imported.issues.length).toBeGreaterThan(0);
    expect(imported.sections[0]?.items[0]?.fields[0]?.textHtml).toBe("<p>Looks worn.</p>");
    expect(imported.sections.some((section) => section.name === "Untitled section")).toBe(true);
  });

  it("fatally rejects a file that cannot be parsed as xlsx", async () => {
    await expect(
      importSpectoraWorkbook({
        buffer: Buffer.from("this is not a spreadsheet"),
        filename: "notes.txt",
      }),
    ).rejects.toBeInstanceOf(FatalImportError);
  });
});
