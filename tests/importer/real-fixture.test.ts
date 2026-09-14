import { describe, expect, it } from "vitest";
import { COL } from "@/lib/importer/columns";
import { importSpectoraWorkbook } from "@/lib/importer/index";
import { loadRealFixture } from "../helpers/fixture";

const SECTION_ORDER = [
  "Inspection Details",
  "Exterior",
  "Roof",
  "Basement, Foundation, Crawlspace & Structure",
  "Heating",
  "Cooling",
  "Plumbing",
  "Electrical",
  "Fireplace",
  "Attic, Insulation & Ventilation",
  "Doors, Windows & Interior",
  "Built-in Appliances",
  "Garage",
];

describe("real Spectora fixture import", () => {
  it("imports hierarchy, types, options, HTML, and issues from the committed export", async () => {
    const fixture = loadRealFixture();
    const imported = await importSpectoraWorkbook(fixture);

    expect(imported.sourceFormat).toBe("spectora-xlsx");
    expect(imported.sourceFilename).toBe(fixture.filename);
    expect(imported.name).toBe("InterNACHI Residential -2026-09-14");

    expect(imported.summary.rowsRead).toBe(392);
    expect(imported.summary.fieldsCreated).toBe(392);
    expect(imported.summary.silentlyDropped).toBe(0);
    expect(imported.summary.sectionCount).toBe(13);
    expect(imported.summary.itemCount).toBe(69);
    expect(imported.summary.uniqueItemNameCount).toBe(61);
    expect(imported.issues).toHaveLength(1);
    expect(imported.summary.unsupportedCount).toBe(1);
    expect(imported.summary.partiallySupported).toBe(1);
    expect(imported.summary.fullyImported + imported.summary.partiallySupported).toBe(392);
    expect(imported.summary.silentlyDropped).toBe(0);

    expect(imported.sections.map((section) => section.name)).toEqual(SECTION_ORDER);

    const fields = imported.sections.flatMap((section) =>
      section.items.flatMap((item) => item.fields),
    );

    const commentTypes = Object.fromEntries(
      ["info", "limit", "defect"].map((type) => [
        type,
        fields.filter((field) => field.commentType === type).length,
      ]),
    );
    expect(commentTypes).toEqual({ info: 78, limit: 12, defect: 302 });

    const answerTypes = Object.fromEntries(
      ["boolean", "checkbox", "number", "text", "date", "range"].map((type) => [
        type,
        fields.filter((field) => field.answerType === type).length,
      ]),
    );
    expect(answerTypes).toEqual({
      boolean: 315,
      checkbox: 72,
      number: 4,
      text: 1,
      date: 0,
      range: 0,
    });

    expect(fields.filter((field) => field.options.length > 0)).toHaveLength(72);
    expect(fields.filter((field) => field.unitOptions.length > 0)).toHaveLength(3);

    const generalItems = imported.sections.flatMap((section) =>
      section.items.filter((item) => item.name === "General"),
    );
    expect(generalItems.length).toBeGreaterThan(1);

    const attendance = fields.find((field) => field.sourceRowNumber === 2);
    expect(attendance?.name).toBe("In Attendance");
    expect(attendance?.answerType).toBe("checkbox");
    expect(attendance?.textHtml).toBeNull();
    expect(attendance?.options.map((option) => option.label)).toEqual([
      "Home Owner",
      "Client",
      "Client's Agent",
      "Listing Agent",
    ]);

    const temperature = fields.find((field) => field.sourceRowNumber === 5);
    expect(temperature?.name).toBe("Temperature");
    expect(temperature?.answerType).toBe("number");
    expect(temperature?.recommendation).toBe("pro");
    expect(temperature?.unitOptions.map((option) => option.label)).toEqual([
      "Fahrenheit (F)",
      "Celsius (C)",
    ]);

    const rValue = fields.find((field) => field.name === "R-value");
    expect(rValue?.answerType).toBe("number");
    expect(rValue?.unitOptions).toEqual([]);
    expect(
      imported.issues.some(
        (entry) => entry.rowNumber === rValue?.sourceRowNumber && entry.sourceColumn === COL.unitOptions,
      ),
    ).toBe(false);

    const dampers = fields.filter((field) => field.name === "Damper Inoperable");
    expect(dampers).toHaveLength(2);
    expect(dampers[0]?.sourceRowNumber).not.toBe(dampers[1]?.sourceRowNumber);

    const siding = imported.sections
      .find((section) => section.name === "Exterior")
      ?.items.find((item) => item.name === "Siding, Flashing & Trim");
    expect(siding).toBeTruthy();
    expect(siding?.fields[0]?.sourceOrder).toBe(0);
    expect(siding?.fields.map((field) => field.position)).toEqual(
      siding?.fields.map((_, index) => index),
    );

    const htmlField = fields.find((field) => field.sourceRowNumber === 12);
    expect(htmlField?.textHtml).toContain("<p>");
    expect(htmlField?.textHtml).toContain("</p>");

    const linked = fields.find((field) => field.sourceRowNumber === 21);
    expect(linked?.textHtml).toContain('href="http://www.familyhandyman.com/doors/repair/fix-sagging-or-sticking-doors/view-all"');
    expect(linked?.textHtml).toContain("Here is a DIY troubleshooting article");

    const entitySection = imported.sections.find((section) =>
      section.name.includes("Crawlspace"),
    );
    expect(entitySection?.name).toBe("Basement, Foundation, Crawlspace & Structure");
    expect(entitySection?.name).not.toContain("&amp;");

    const youtube = fields.find((field) => field.sourceRowNumber === 311);
    expect(youtube?.name).toBe("Doorknob Hole");
    expect(youtube?.textHtml).toContain("youtube-embed-wrapper");
    expect(youtube?.supportStatus).toBe("partial");

    const youtubeIssue = imported.issues.find((entry) => entry.rowNumber === 311);
    expect(youtubeIssue?.severity).toBe("unsupported");
    expect(youtubeIssue?.sourceColumn).toBe(COL.commentText);
    expect(youtubeIssue?.message).toMatch(/unsupported by importer|cannot safely render/i);

    expect(
      imported.issues.filter((entry) => entry.sourceColumn === COL.commentText && entry.rowNumber !== 311),
    ).toHaveLength(0);

    const emptyTextRows = fields.filter((field) => field.textHtml === null);
    expect(emptyTextRows.length).toBe(83);
    expect(
      imported.issues.some(
        (entry) =>
          entry.sourceColumn === COL.commentText &&
          entry.message.toLowerCase().includes("missing") &&
          emptyTextRows.some((field) => field.sourceRowNumber === entry.rowNumber),
      ),
    ).toBe(false);

    const defaultValue = fields.find((field) => field.defaultValue === "true");
    expect(defaultValue?.name).toBe("Homeowner's Responsibility");
  });
});
