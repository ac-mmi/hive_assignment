import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/persist-import";
import { templates } from "@/lib/db/schema";

export type TemplateGraph = {
  id: string;
  name: string;
  sourceFormat: string;
  sourceFilename: string;
  createdAt: Date;
  updatedAt: Date;
  issues: Array<{
    id: string;
    severity: string;
    rowNumber: number | null;
    sourceColumn: string | null;
    message: string;
    rawValue: string | null;
    createdAt: Date;
  }>;
  sections: Array<{
    id: string;
    name: string;
    description: string | null;
    position: number;
    items: Array<{
      id: string;
      name: string;
      position: number;
      fields: Array<{
        id: string;
        name: string;
        textHtml: string | null;
        commentType: string;
        category: number | null;
        answerType: string;
        position: number;
        sourceOrder: number | null;
        sourceRowNumber: number;
        defaultValue: string | null;
        defaultValue2: string | null;
        defaultUnitType: string | null;
        defaultLocation: string | null;
        estimateMin: number | null;
        estimateMax: number | null;
        locked: string | null;
        simpleFormat: string | null;
        disablePhotos: string | null;
        uses: string | null;
        recommendation: string | null;
        sourceLastModified: string | null;
        photosJson: Array<{
          index: number;
          photo: string | null;
          caption: string | null;
        }>;
        supportStatus: string;
        options: Array<{ id: string; label: string; position: number }>;
        unitOptions: Array<{ id: string; label: string; position: number }>;
      }>;
    }>;
  }>;
};

export async function listTemplates(db: AppDb) {
  return db.query.templates.findMany({
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}

export async function getTemplateGraph(
  db: AppDb,
  id: string,
): Promise<TemplateGraph | undefined> {
  const result = await db.query.templates.findFirst({
    where: eq(templates.id, id),
    with: {
      issues: {
        orderBy: (table, { asc }) => [asc(table.rowNumber), asc(table.createdAt)],
      },
      sections: {
        orderBy: (table, { asc }) => [asc(table.position)],
        with: {
          items: {
            orderBy: (table, { asc }) => [asc(table.position)],
            with: {
              fields: {
                orderBy: (table, { asc }) => [asc(table.position)],
                with: {
                  options: {
                    orderBy: (table, { asc }) => [asc(table.position)],
                  },
                  unitOptions: {
                    orderBy: (table, { asc }) => [asc(table.position)],
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  return result as TemplateGraph | undefined;
}
