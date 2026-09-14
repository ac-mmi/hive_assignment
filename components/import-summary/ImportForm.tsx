"use client";

import { useState } from "react";
import type { ImportIssue, ImportSummary } from "@/lib/importer/types";
import { ImportSummaryCard } from "./ImportSummaryCard";

type ImportResponse = {
  templateId: string;
  name: string;
  summary: ImportSummary;
  issues: ImportIssue[];
  error?: string;
};

export function ImportForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ImportResponse;
      if (!response.ok) {
        setError(payload.error ?? "Import failed.");
        return;
      }
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <form
        className="rounded-lg border border-line bg-surface p-6"
        action={onSubmit}
      >
        <label className="block text-sm font-medium">
          Spectora spreadsheet
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            name="file"
            accept=".xls,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            required
          />
        </label>
        <button
          className="mt-5 rounded-full bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={busy}
        >
          {busy ? "Importing…" : "Import"}
        </button>
      </form>
      {error ? (
        <p className="mt-4 rounded-lg border border-defect/30 bg-white px-4 py-3 text-sm text-defect">
          {error}
        </p>
      ) : null}
      {result ? <ImportSummaryCard result={result} /> : null}
    </div>
  );
}
