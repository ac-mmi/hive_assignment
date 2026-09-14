import {
  MISSING_FROM_EXPORT_NOTE,
  MISSING_FROM_EXPORT_TITLE,
  UNSUPPORTED_BY_IMPORTER_NOTE,
  UNSUPPORTED_BY_IMPORTER_TITLE,
} from "@/lib/import-trust";

export function TrustLegend() {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="rounded-lg border border-line bg-paper p-3">
        <p className="font-medium">{MISSING_FROM_EXPORT_TITLE}</p>
        <p className="mt-1 text-muted">{MISSING_FROM_EXPORT_NOTE}</p>
      </div>
      <div className="rounded-lg border border-line bg-paper p-3">
        <p className="font-medium">{UNSUPPORTED_BY_IMPORTER_TITLE}</p>
        <p className="mt-1 text-muted">{UNSUPPORTED_BY_IMPORTER_NOTE}</p>
      </div>
    </div>
  );
}
