# Hive Inspect — Spectora Template Importer

Take-home app that imports a Spectora inspection template spreadsheet into a structured, editable Hive Inspect template. It preserves hierarchy, order, comment HTML, and reports importer limitations instead of dropping rows.

Source of truth: [`docs/PROJECT_SPEC.md`](docs/PROJECT_SPEC.md) and the committed export [`fixtures/InterNACHI Residential -2026-09-14.xls`](fixtures/InterNACHI%20Residential%20-2026-09-14.xls).

## Project overview

Inspectors have years of template customization in Spectora. Recreating that by hand is unacceptable. This app:

1. Uploads a Spectora HTML-text spreadsheet export (Office Open XML / xlsx, even when the file ends in `.xls`).
2. Imports it into Template → Section → Item → Field/Comment → Options.
3. Persists that graph in PostgreSQL.
4. Lets you rename sections/items, edit comment text, save, and reload.
5. Duplicates a template as an independent graph (new IDs for every child record).
6. Surfaces import issues so unsupported content is visible rather than silently dropped.

It is not a rebuild of Hive Inspect. There is no scheduling, payments, homeowner portal, mobile UI, authentication, or LLM mapping.

## Architecture

```text
Upload / seed
  → sniff OOXML (PK zip bytes)
  → parse worksheet by cell address (empty cells are omitted from sheet XML)
  → map columns → Template / Section / Item / Field / Options
  → validate (unknown types, unsupported HTML, malformed rows)
  → persist in one PostgreSQL transaction

Editor and duplicate APIs read/write the same Postgres graph.
Seed (`npm run db:seed`) and `POST /api/imports` share `lib/import/run-import.ts`.
```

Key modules:

| Path | Role |
| --- | --- |
| `lib/importer/` | Sniff, parse, map, validate, HTML inspect/sanitize |
| `lib/import/run-import.ts` | Shared import + persist path |
| `lib/db/` | Schema, queries, editor mapping, updates |
| `lib/duplication/` | Deep copy with new UUIDs, insert-only persist |
| `app/api/` | Import, template, section, item, field, duplicate |
| `app/templates/[id]` | Structured editor |
| `app/templates/[id]/issues` | Import-trust UI |
| `supabase/migrations/` | SQL migrations applied by `npm run db:migrate` |

The committed file uses a `.xls` extension but is **xlsx (OOXML)**. The importer sniffs magic bytes and refuses legacy BIFF and HTML-as-xls. It does not invent Spectora columns.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- PostgreSQL (local Docker Compose or Homebrew; production via Supabase or any Postgres)
- Drizzle ORM
- ExcelJS for xlsx parsing
- htmlparser2 for comment HTML inspect/sanitize
- Vitest + PGlite for tests
- Tailwind CSS 4

## Local setup

The only required environment variable is `DATABASE_URL`. Copy the example, start Postgres, migrate, and seed.

```bash
cp .env.example .env.local
# .env.local must contain:
# DATABASE_URL=postgres://hive:hive@127.0.0.1:5432/hive
```

### PostgreSQL setup

**Option A — Docker**

```bash
docker compose up -d
```

`docker-compose.yml` creates user `hive` / password `hive` / database `hive` on port 5432.

**Option B — Homebrew PostgreSQL 16** (if Docker is not running and port 5432 is already a local server)

```bash
brew services start postgresql@16
psql -d postgres -c "CREATE ROLE hive LOGIN PASSWORD 'hive';"
psql -d postgres -c "CREATE DATABASE hive OWNER hive;"
psql -d hive -c "GRANT ALL ON SCHEMA public TO hive; ALTER SCHEMA public OWNER TO hive;"
```

Then:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Seed imports `fixtures/InterNACHI Residential -2026-09-14.xls` through the same importer as the upload API. Re-running seed is a no-op if that filename is already stored.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string for the app, migrations, and seed |

Do not commit credentials. `.env`, `.env.local`, and related files are gitignored. `.env.example` contains only the local Docker URL.

Vercel injects `VERCEL=1` during deploy; the app uses that only to keep the Postgres pool small. There is no localhost fallback at runtime.

## Commands

```bash
npm run db:migrate    # apply SQL in supabase/migrations to DATABASE_URL
npm run db:seed       # import the committed InterNACHI fixture if not already present
npm run dev           # Next.js dev server
npm test              # Vitest (PGlite; does not need local Postgres)
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run build         # production Next.js build
```

`npm run db:generate` regenerates Drizzle SQL from `lib/db/schema.ts`. Do not hand-edit generated migrations unless you know why.

## Import workflow

1. Open `/import` (or **Import Spectora file** in the header).
2. Upload a Spectora HTML-text spreadsheet with the same column titles as the committed export.
3. The API runs: OOXML sniff → cell-address parsing → mapping → validation → transactional persist.
4. The summary shows sections, items, unique item names, fields, processed rows, issue count, and the missing-vs-unsupported distinction.
5. Open the template editor. Rename a section or item, edit comment text, save, then reload — changes are in PostgreSQL.
6. Duplicate creates a new template graph. Edits to the copy do not mutate the original.

The real InterNACHI fixture currently produces **1 import issue**: source row 311, Walls → Doorknob Hole, a YouTube embed `<div>` in Comment Text. The paragraph is stored; the limitation is listed. Empty comment text (83 rows) is missing from the export, not an issue.

## Second Spectora export

No second real customer export was supplied. The parser is generic: it keys off Spectora **column titles** and cell addresses, not InterNACHI section/item names or row counts. `tests/importer/generic-columns.test.ts` is a labeled structure check with different names, not a second Spectora file.

## Deployment (Vercel)

Do not deploy until a production Postgres URL is available. The repo is deployment-ready; credentials are not in source control.

1. Create a Postgres database (Supabase is the documented path). Prefer the **transaction pooler** URL (port `6543`) with `sslmode=require`.
2. From this machine, apply schema and seed **against that database**:

```bash
DATABASE_URL='postgres://USER:PASSWORD@HOST:6543/postgres?sslmode=require' npm run db:migrate
DATABASE_URL='postgres://USER:PASSWORD@HOST:6543/postgres?sslmode=require' npm run db:seed
```

3. In Vercel: import the Git repo, framework Next.js, set the same `DATABASE_URL` as a project environment variable (Production, and Preview if you want preview deploys to work).
4. Deploy. The home page should list the seeded InterNACHI template. Opening it loads from Postgres, not mock data.

Vercel does not run `db:migrate` or `db:seed` during `next build`. Run those yourself against production Postgres before or immediately after the first deploy.

If the pooler rejects connections, try the Supabase session pooler / direct URL instead, still with `sslmode=require`. Prepared statements are disabled in the app so transaction-mode PgBouncer can work.

## Libraries and starter code

- Next.js App Router starter (this repo’s `app/` layout, Tailwind, ESLint config)
- Drizzle ORM + `drizzle-kit` for schema and migrations
- ExcelJS
- htmlparser2
- postgres.js
- PGlite (in-memory Postgres for tests)
- Vitest

No Hive Inspect source was copied. No Binsr/Hive product UI was used as a starter.

## AI coding tools

Implementation was assisted by **Cursor** (agent sessions) against `docs/PROJECT_SPEC.md` and the real Spectora fixture. Generated code was reviewed against the actual export (cell-address parsing, grouping, HTML, the row 311 issue). Mapping is deterministic from column titles; an LLM is not in the import path.
