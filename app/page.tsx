import Link from "next/link";
import { getDb } from "@/lib/db";
import { listTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let templates: Awaited<ReturnType<typeof listTemplates>> = [];
  let dbError: string | null = null;

  try {
    templates = await listTemplates(getDb());
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Database is not available.";
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.18em] text-muted">Template library</p>
      <h1 className="display mt-2 max-w-3xl text-4xl leading-tight">
        Keep the inspection template that took years to tune.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Upload a Spectora spreadsheet export. Hive Inspect stores sections, items, and
        comments as structured records so you can edit and duplicate them without
        rebuilding the template by hand.
      </p>

      {dbError ? (
        <div className="mt-8 rounded-lg border border-line bg-surface p-5 text-sm">
          <p className="font-medium">Database is not connected yet.</p>
          <p className="mt-2 text-muted">{dbError}</p>
          <p className="mt-2 text-muted">
            Copy <code>.env.example</code> to <code>.env.local</code>, start Postgres
            with <code>docker compose up -d</code>, then run <code>npm run db:migrate</code>{" "}
            and <code>npm run db:seed</code>.
          </p>
        </div>
      ) : templates.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line bg-surface p-8">
          <p className="font-medium">No templates yet.</p>
          <p className="mt-2 text-muted">
            Import <code>InterNACHI Residential -2026-09-14.xls</code> to create the first
            one.
          </p>
          <Link
            href="/import"
            className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Import Spectora file
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-surface">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <Link
                  href={`/templates/${template.id}`}
                  className="display text-xl hover:text-accent"
                >
                  {template.name}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  Source: {template.sourceFilename}
                </p>
              </div>
              <Link
                href={`/templates/${template.id}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
