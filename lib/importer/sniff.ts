export type SpreadsheetKind = "xlsx" | "ole-biff" | "html" | "unknown";

const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

function startsWithBytes(buffer: Uint8Array, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((b, i) => buffer[i] === b);
}

/**
 * Detect the actual bytes of an uploaded Spectora export.
 * The committed fixture is OOXML (xlsx) despite a .xls filename.
 * Legacy BIFF and HTML-as-xls are rejected until a real sample exists.
 */
export function sniffSpreadsheet(buffer: Uint8Array): SpreadsheetKind {
  if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return "xlsx";
  }
  if (startsWithBytes(buffer, OLE_MAGIC)) {
    return "ole-biff";
  }
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(buffer.subarray(0, 800))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  if (
    head.startsWith("<html") ||
    head.startsWith("<!doctype html") ||
    head.startsWith("<table") ||
    head.startsWith("<?xml")
  ) {
    return "html";
  }
  return "unknown";
}

export function describeUnsupportedKind(kind: SpreadsheetKind): string {
  switch (kind) {
    case "ole-biff":
      return "This file is a legacy Excel BIFF/.xls binary. The Spectora export supplied for this project is Office Open XML (xlsx) with a .xls filename, and BIFF parsing is not implemented.";
    case "html":
      return "This file looks like HTML, not the Office Open XML Spectora export. HTML-as-spreadsheet parsing is not implemented because the committed fixture is xlsx.";
    case "unknown":
      return "This file is not a recognized Spectora Office Open XML (xlsx) spreadsheet.";
    default:
      return "Unsupported spreadsheet format.";
  }
}
