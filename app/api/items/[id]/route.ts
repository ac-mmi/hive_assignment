import { NextResponse } from "next/server";
import { jsonError, readJson } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { renameItem } from "@/lib/db/updates";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await readJson(request);
  const name =
    body && typeof body === "object" && "name" in body && typeof body.name === "string"
      ? body.name.trim()
      : "";
  if (!name) return jsonError("Item name is required.", 400);
  const updated = await renameItem(getDb(), id, name);
  if (!updated) return jsonError("Item not found.", 404);
  return NextResponse.json({ id: updated.id, name });
}
