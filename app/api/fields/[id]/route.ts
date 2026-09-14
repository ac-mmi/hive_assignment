import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { updateFieldText } from "@/lib/db/updates";
import { isCommentHtmlEmpty, sanitizeCommentHtml } from "@/lib/importer/html";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await readJson(request);
  if (!body || typeof body !== "object" || !("textHtml" in body)) {
    return jsonError("textHtml is required.", 400);
  }
  const raw = body.textHtml;
  if (raw !== null && typeof raw !== "string") {
    return jsonError("textHtml must be a string or null.", 400);
  }
  const textHtml =
    raw === null || raw.trim() === "" || isCommentHtmlEmpty(raw)
      ? null
      : sanitizeCommentHtml(raw);
  const updated = await updateFieldText(getDb(), id, textHtml);
  if (!updated) return jsonError("Field not found.", 404);
  return NextResponse.json({ id: updated.id, textHtml });
}
