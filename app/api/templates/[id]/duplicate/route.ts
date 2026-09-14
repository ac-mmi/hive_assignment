import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { duplicateTemplate } from "@/lib/duplication/duplicate-template";
import { getTemplateGraph } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const existing = await getTemplateGraph(getDb(), id);
    if (!existing) return jsonError("Template not found.", 404);
    const duplicated = await duplicateTemplate(getDb(), id);
    return NextResponse.json(duplicated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not duplicate template.";
    return jsonError(message, 500);
  }
}
