import { ImportForm } from "@/components/import-summary/ImportForm";

export default function ImportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.18em] text-muted">Spectora export</p>
      <h1 className="display mt-2 text-4xl">Import a template</h1>
      <p className="mt-4 text-lg text-muted">
        Use the committed Spectora HTML-text spreadsheet export. The importer reads
        Office Open XML by cell address, then stores a structured template. Unsupported
        content is listed instead of being dropped.
      </p>
      <ImportForm />
    </main>
  );
}
