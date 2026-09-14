import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/persist-import";
import { fields, items, sections, templates } from "@/lib/db/schema";

async function touchTemplate(db: AppDb, templateId: string) {
  await db
    .update(templates)
    .set({ updatedAt: new Date() })
    .where(eq(templates.id, templateId));
}

export async function renameSection(db: AppDb, id: string, name: string) {
  const updated = await db
    .update(sections)
    .set({ name, updatedAt: new Date() })
    .where(eq(sections.id, id))
    .returning();
  const row = updated[0];
  if (!row) return null;
  await touchTemplate(db, row.templateId);
  return row;
}

export async function renameItem(db: AppDb, id: string, name: string) {
  const updated = await db
    .update(items)
    .set({ name, updatedAt: new Date() })
    .where(eq(items.id, id))
    .returning();
  const row = updated[0];
  if (!row) return null;
  const parent = await db.query.sections.findFirst({
    where: eq(sections.id, row.sectionId),
  });
  if (parent) await touchTemplate(db, parent.templateId);
  return row;
}

export async function updateFieldText(db: AppDb, id: string, textHtml: string | null) {
  const updated = await db
    .update(fields)
    .set({ textHtml, updatedAt: new Date() })
    .where(eq(fields.id, id))
    .returning();
  const row = updated[0];
  if (!row) return null;
  const item = await db.query.items.findFirst({
    where: eq(items.id, row.itemId),
  });
  if (item) {
    const parent = await db.query.sections.findFirst({
      where: eq(sections.id, item.sectionId),
    });
    if (parent) await touchTemplate(db, parent.templateId);
  }
  return row;
}
