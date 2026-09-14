import { describe, expect, it } from "vitest";
import { describeUnsupportedKind, sniffSpreadsheet } from "@/lib/importer/sniff";
import { loadRealFixture } from "../helpers/fixture";

describe("sniffSpreadsheet", () => {
  it("detects the committed Spectora fixture as xlsx, not BIFF or HTML", () => {
    const { buffer } = loadRealFixture();
    expect(sniffSpreadsheet(buffer)).toBe("xlsx");
  });

  it("rejects OLE/BIFF compound files", () => {
    const buffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    expect(sniffSpreadsheet(buffer)).toBe("ole-biff");
    expect(describeUnsupportedKind("ole-biff")).toMatch(/BIFF/i);
  });

  it("rejects HTML-as-spreadsheet bytes", () => {
    const buffer = Buffer.from("<html><table><tr><td>Section Name</td></tr></table></html>");
    expect(sniffSpreadsheet(buffer)).toBe("html");
  });
});
