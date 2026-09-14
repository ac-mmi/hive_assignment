import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/http";
import { getDb } from "@/lib/db";
import { listTemplates } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  try {
    const templates = await listTemplates(getDb());
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list templates.";
    return jsonError(message, 500);
  }
}
