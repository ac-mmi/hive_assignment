import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="display text-xl tracking-tight">Hive Inspect</span>
          <span className="text-sm text-muted">Spectora importer</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/" className="text-muted hover:text-ink">
            Templates
          </Link>
          <Link
            href="/import"
            className="rounded-full bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90"
          >
            Import Spectora file
          </Link>
        </nav>
      </div>
    </header>
  );
}
