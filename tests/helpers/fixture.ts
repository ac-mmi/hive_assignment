import { readFileSync } from "node:fs";
import path from "node:path";

export const REAL_FIXTURE_FILENAME = "InterNACHI Residential -2026-09-14.xls";

export function realFixturePath(): string {
  return path.join(process.cwd(), "fixtures", REAL_FIXTURE_FILENAME);
}

export function loadRealFixture(): { buffer: Buffer; filename: string } {
  return {
    buffer: readFileSync(realFixturePath()),
    filename: REAL_FIXTURE_FILENAME,
  };
}
