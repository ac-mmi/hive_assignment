# NOTES

## What was built

A desktop web app that imports a Spectora HTML-text spreadsheet into a structured Hive Inspect template, persists it in PostgreSQL, edits the baseline fields, duplicates independently, and shows importer limitations.

The import path is:

```text
OOXML sniff → cell-address parse → map → validate → transactional persist
```

Seed and the upload API share `lib/import/run-import.ts`. The editor reads the same Postgres graph. Duplicate allocates new UUIDs for the template, sections, items, fields, options, unit options, and import issues, then **inserts** a new graph. It does not update original rows.

Baseline editor: rename section, rename item, edit comment text, save. Import-trust UI is the one improvement beyond baseline (counts, source row/column, missing vs unsupported).

## What was intentionally cut, and why

The assignment is a two-day migration workflow, not a product rebuild.

- Inspection-report authoring, scheduling, payments, homeowner portal, mobile UI
- User accounts / auth (the server uses `DATABASE_URL`; the take-home does not need login)
- Photo manager (Default Photo 1–10 are stored as JSON, empty in this export, not edited)
- Answer-type / option editing in the UI (values are preserved and displayed, not rewritten)
- LLM / AI import mapping (the export already has structured columns)
- Full Hive Inspect feature parity

Cuts protect preservation and trust. Extra surface area would have delayed the import/edit/duplicate loop.

## Supported input

- Spectora HTML-text spreadsheet export as Office Open XML (`xlsx`), including files named `.xls` whose bytes are a zip package
- Column titles from the committed InterNACHI export (see `lib/importer/columns.ts`)
- Multiple worksheets are not merged; the first worksheet is used
- Known comment types: `info`, `limit`, `defect`
- Known answer types: `boolean`, `checkbox`, `number`, `text`, `date`, `range`
- Comment HTML stored as the original cell string; names decode entities (`&amp;` → `&`)
- Multiple-choice and unit option lists split on commas without rewriting labels

Rejected as fatal (file cannot be parsed as this importer): empty upload, legacy BIFF `.xls`, HTML-as-xls, unreadable zip.

## Known limitations

- **No second real Spectora export** was supplied. Parser genericity is checked with a labeled workbook that uses the same headers and different names (`tests/importer/generic-columns.test.ts`). That file is not a customer export.
- YouTube **embed wrappers** (`<div class="youtube-embed-wrapper">`) are unsupported in the renderer. YouTube **links** (`<a href="https://www.youtube.com/...">`) are preserved.
- `Order (w/i item)` is stored as `source_order` but is not unique in this export (38 items reuse values). Display `position` is first-seen source row order within the item. We do not alphabetize.
- Empty optional cells are omitted from sheet XML; the parser must use cell addresses. Sequential cell reading would mis-assign columns.
- Item grouping is `(Section Name, Item Name)`: 61 unique item-name strings and 69 unique pairs because names such as `General` repeat.
- Every source row is a field. Comment names are not unique (`Damper Inoperable` appears twice).
- Date/range types are recognized but unused in this fixture; unknown types are stored, not coerced.
- The editor does not author new sections/items/fields.
- Duplicate name helper is `Name (copy)` / `Name (copy) 2`; colliding copy names are allowed because IDs differ.
- Production deploy is prepared but **not performed** in this pass: no Vercel project credentials were available.

## Rich-content / HTML behavior

Comment Text is stored raw, including `<p>`, `<a href>`, and entities.

On render, `sanitizeCommentHtml` keeps `p`, `a` (http/https only), `strong`, `b`, `em`, `i`, `br`, `ul`, `ol`, `li`. Scripts, event handlers, `javascript:` URLs, and unknown tags (including the YouTube wrapper `div`) are not executed or re-emitted. Original HTML remains on the field and in the import issue `raw_value` when unsupported constructs are found.

Unsafe HTML is not rendered through the stored string; the preview uses the sanitized output.

## Missing vs unsupported

**Missing from the Spectora export** (not listed as issues):

- Empty Comment Text (83 rows in the real fixture, mostly checkbox labels)
- Empty Category on `info` / `limit` rows
- Empty unit options on the R-value number field
- Empty photo, locked, simple format, default location, and default value 2 columns

**Present in the export but unsupported by our importer** (listed):

- The real fixture’s **one** issue: source row **311**, column **Comment Text**, field **Doorknob Hole** (Walls). HTML includes `<div class="youtube-embed-wrapper">`. Paragraph text is imported; `support_status` is `partial`. Silently dropped row count is 0.

A bad row does not abort the import.

## How preservation was checked

Automated tests against the committed file (`tests/importer/real-fixture.test.ts`, `preservation.test.ts`):

- 13 sections in first-seen order
- 69 items / 61 unique item names / 392 fields / 392 rows read / 0 silently dropped
- comment types, answer types, option and unit splits
- HTML paragraphs and links kept
- `&amp;` decoded in section names
- empty comment text is not turned into issues
- row 311 issue is the only Comment Text issue

Persistence tests import the real workbook into PGlite, save section/item/comment edits, reload, and assert the database values.

This pass did **not** re-drive a browser upload of the fixture after the trust-UI copy changes. Upload API and seed both call `runImport`. A live Postgres HTTP duplicate/edit was done in an earlier session and the copy was deleted; this pass relies on the PGlite copy-isolation and acceptance tests for that workflow.

## How duplicate isolation was checked

`tests/duplication/copy-isolation.test.ts` (no mocks of the hierarchy):

1. Import the real InterNACHI fixture into PGlite
2. Duplicate
3. Assert every template/section/item/field/option/unit-option/issue ID on the copy is new
4. Assert names, text, options, units, and order match
5. Rename a section, item, and comment on the copy
6. Reload the copy — edits remain
7. Reload the original — unchanged

`tests/acceptance/internachi-workflow.test.ts` runs import → persist → edit → reload → duplicate → edit copy → original unchanged, and asserts the row 311 issue is present on both graphs with different issue IDs.

Duplicate persist is insert-only (`persistImportedTemplate`). Updates (`renameSection` / `renameItem` / `updateFieldText`) key by the copied row IDs.

## Failure case

Demonstrate row 311, Doorknob Hole:

> I chose to surface the YouTube embed wrapper rather than silently dropping it because migration trust is more important than pretending the importer supports every Spectora HTML construct. The comment text is still in the database; the limitation is listed with source row and column.

Empty comment cells are the contrasting case: they were not in the export.

## Approximate development time

Not stopwatch-tracked. Work spanned multiple Cursor sessions against the spec and the real export: fixture inspection, schema/importer, editor/duplicate, then this final trust-UI / docs / acceptance-test pass. Roughly **two focused implementation days** plus a shorter verification pass, in line with the assignment’s two-day scope.

## Credits

- Next.js App Router + Tailwind starter that this repo was initialized from
- Drizzle ORM, drizzle-kit, postgres.js, ExcelJS, htmlparser2, PGlite, Vitest, React
- Spectora export supplied for the assignment (`fixtures/InterNACHI Residential -2026-09-14.xls`)
- `docs/PROJECT_SPEC.md` as the implementation contract

No Hive Inspect application source was copied into this repo.

## Binsr / Hive product exploration

**Binsr / the live Hive Inspect product was not explored.** There was no product login or walkthrough of the production app in this work. The importer was built from the take-home spec and the Spectora file. I therefore cannot give first-hand Hive product feedback (information architecture, inspector workflow, report UX). That is a gap for the submission video: if product critique is required, it has to come from a separate exploration, not from this codebase.

## Schema extras (beyond the spec’s logical model)

- `source_row_number` so issues can point at the spreadsheet
- `source_order` plus unique `position`
- `support_status` (`full` | `partial`)
- `photos_json` for Default Photo 1–10 (empty in this export)

## Local Postgres extras

Docker Compose creates user `hive` / password `hive` / database `hive` on port 5432.

If Homebrew `postgresql@16` is already listening on 5432 instead:

```bash
psql -d postgres -c "CREATE ROLE hive LOGIN PASSWORD 'hive';"
psql -d postgres -c "CREATE DATABASE hive OWNER hive;"
psql -d hive -c "GRANT ALL ON SCHEMA public TO hive; ALTER SCHEMA public OWNER TO hive;"
```

Then `DATABASE_URL=postgres://hive:hive@127.0.0.1:5432/hive`.
