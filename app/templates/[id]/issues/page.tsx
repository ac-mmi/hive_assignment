import Link from "next/link";
import { notFound } from "next/navigation";
import { TrustLegend } from "@/components/import-summary/TrustLegend";
import { getDb } from "@/lib/db";
import { getTemplateGraph } from "@/lib/db/queries";
import {
  findGraphFieldBySourceRow,
  graphImportStats,
  issueTrustTitle,
} from "@/lib/import-trust";

export const dynamic = "force-dynamic";

export default async function TemplateIssuesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplateGraph(getDb(), id);
  if (!template) notFound();
  const stats = graphImportStats(template);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.18em] text-muted">Import trust</p>
      <h1 className="display mt-2 text-4xl">Issues for {template.name}</h1>
      <p className="mt-4 text-muted">
        These records distinguish content the Spectora export did not contain from
        content this importer cannot represent yet. Nothing listed here was silently
        dropped.
      </p>
      <p className="mt-3 text-sm">
        <Link href={`/templates/${template.id}`} className="text-accent hover:underline">
          Back to template
        </Link>
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Sections</dt>
          <dd className="text-lg font-medium">{stats.sectionCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Items</dt>
          <dd className="text-lg font-medium">{stats.itemCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Unique item names</dt>
          <dd className="text-lg font-medium">{stats.uniqueItemNameCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Fields</dt>
          <dd className="text-lg font-medium">{stats.fieldCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Processed rows</dt>
          <dd className="text-lg font-medium">{stats.processedRows}</dd>
        </div>
        <div>
          <dt className="text-muted">Import issues</dt>
          <dd className="text-lg font-medium">{stats.issueCount}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <TrustLegend />
      </div>

      {template.issues.length === 0 ? (
        <p className="mt-8 rounded-lg border border-line bg-surface p-5 text-sm">
          No importer limitations were recorded for this file. Empty optional cells are
          missing from the Spectora export, not listed here.
        </p>
      ) : (
        <ol className="mt-8 space-y-3">
          {template.issues.map((issue) => {
            const located = findGraphFieldBySourceRow(template, issue.rowNumber);
            return (
              <li key={issue.id} className="rounded-lg border border-line bg-surface p-4">
                <p className="text-sm font-medium">{issueTrustTitle(issue.severity)}</p>
                <p className="mt-1 text-xs text-muted">
                  {issue.rowNumber ? `Source row ${issue.rowNumber}` : "No source row"}
                  {issue.sourceColumn ? ` · cell column ${issue.sourceColumn}` : ""}
                </p>
                {located ? (
                  <p className="mt-1 text-xs text-muted">
                    {located.sectionName} / {located.itemName} / {located.fieldName}
                  </p>
                ) : null}
                <p className="mt-2 text-sm">{issue.message}</p>
                {issue.rawValue ? (
                  <pre className="mt-3 overflow-auto rounded bg-paper p-3 text-xs whitespace-pre-wrap">
                    {issue.rawValue}
                  </pre>
                ) : null}
                {located ? (
                  <p className="mt-3 text-sm">
                    <Link
                      href={`/templates/${template.id}?field=${located.fieldId}`}
                      className="text-accent hover:underline"
                    >
                      Open this field in the editor
                    </Link>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
