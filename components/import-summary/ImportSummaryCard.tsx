import Link from "next/link";
import { TrustLegend } from "@/components/import-summary/TrustLegend";
import { issueTrustTitle } from "@/lib/import-trust";
import type { ImportIssue, ImportSummary } from "@/lib/importer/types";

export function ImportSummaryCard({
  result,
}: {
  result: {
    templateId: string;
    name: string;
    summary: ImportSummary;
    issues: ImportIssue[];
  };
}) {
  const { summary, issues, templateId, name } = result;
  const issueCount = summary.warningCount + summary.unsupportedCount;

  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-6">
      <p className="text-sm font-medium text-ok">Import complete</p>
      <h2 className="display mt-1 text-2xl">{name}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Sections</dt>
          <dd className="text-lg font-medium">{summary.sectionCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Items</dt>
          <dd className="text-lg font-medium">{summary.itemCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Unique item names</dt>
          <dd className="text-lg font-medium">{summary.uniqueItemNameCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Fields</dt>
          <dd className="text-lg font-medium">{summary.fieldsCreated}</dd>
        </div>
        <div>
          <dt className="text-muted">Processed rows</dt>
          <dd className="text-lg font-medium">{summary.rowsRead}</dd>
        </div>
        <div>
          <dt className="text-muted">Import issues</dt>
          <dd className="text-lg font-medium">{issueCount}</dd>
        </div>
        <div>
          <dt className="text-muted">Fully imported</dt>
          <dd className="text-lg font-medium">{summary.fullyImported}</dd>
        </div>
        <div>
          <dt className="text-muted">Partially supported</dt>
          <dd className="text-lg font-medium">{summary.partiallySupported}</dd>
        </div>
        <div>
          <dt className="text-muted">Silently dropped</dt>
          <dd className="text-lg font-medium">{summary.silentlyDropped}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted">
        Item count is unique (section, item) pairs. Names such as General repeat across
        sections, so unique item names can be lower.
      </p>
      <div className="mt-4">
        <TrustLegend />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {issueCount > 0 ? (
          <Link
            href={`/templates/${templateId}/issues`}
            className="rounded-full border border-line px-4 py-2 text-sm font-medium"
          >
            View import issues
          </Link>
        ) : null}
        <Link
          href={`/templates/${templateId}`}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Open template
        </Link>
      </div>
      {issues.length > 0 ? (
        <ol className="mt-5 space-y-2 text-sm">
          {issues.slice(0, 8).map((issue) => (
            <li key={issue.id} className="rounded border border-line px-3 py-2">
              <p className="font-medium">{issueTrustTitle(issue.severity)}</p>
              <p className="mt-1 text-xs text-muted">
                {issue.rowNumber ? `Source row ${issue.rowNumber}` : "No source row"}
                {issue.sourceColumn ? ` · ${issue.sourceColumn}` : ""}
              </p>
              <p className="mt-1 text-muted">{issue.message}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
