import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { runImport } from "@/lib/import/run-import";
import { FatalImportError } from "@/lib/importer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Upload a Spectora spreadsheet using the file field.", 400);
  }
  if (file.size === 0) {
    return jsonError("The uploaded file is empty.", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const imported = await runImport(getDb(), {
      buffer,
      filename: file.name,
    });
    return NextResponse.json({
      templateId: imported.id,
      name: imported.name,
      summary: imported.summary,
      issues: imported.issues,
    });
  } catch (error) {
    if (error instanceof FatalImportError) {
      return jsonError(error.message, 400);
    }
    const message = error instanceof Error ? error.message : "Import failed.";
    return jsonError(message, 500);
  }
}
