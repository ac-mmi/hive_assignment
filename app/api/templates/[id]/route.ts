import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { getTemplateGraph } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const template = await getTemplateGraph(getDb(), id);
    if (!template) return jsonError("Template not found.", 404);
    return NextResponse.json({ template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load template.";
    return jsonError(message, 500);
  }
}
