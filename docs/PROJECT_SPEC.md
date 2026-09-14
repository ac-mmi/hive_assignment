# Hive Inspect — Spectora Template Importer
## Project Requirements & Technical Design

> **Source of truth:** Hive Inspect take-home assignment + the actual Spectora export
> `InterNACHI Residential -2026-09-14.xls` supplied for this project.
>
> This document is intentionally scoped to the assignment. It is not a specification for rebuilding Hive Inspect.

---

## 1. Problem

An inspection company is moving from Spectora to Hive Inspect. They have a template that has been tuned for years and will not manually recreate it.

The product we are building must let the user:

1. Upload a Spectora **HTML-text spreadsheet export**.
2. Import its content into a structured, editable template.
3. Preserve text, hierarchy, and ordering.
4. Make unsupported/skipped content visible instead of silently dropping it.
5. Edit section names, item names, and comment text.
6. Save those changes in a real backend.
7. Duplicate a template and edit the copy independently.
8. Reopen the application and retrieve persisted templates.
9. Demonstrate preservation, edits, independent copies, and at least one failure case.

The assignment explicitly values faithful import, a usable workflow, and good decisions about scope over feature breadth.

---

## 2. Scope

### Required

- Web application for desktop use.
- Spectora HTML-text spreadsheet import.
- Structured template model.
- Persistent backend/database.
- Section/item/comment editing.
- Template duplication.
- Import validation and visible warnings.
- Seed the deployed app with an imported template.
- Public deployment on Vercel (or document an alternative if required).
- README, NOTES.md, meaningful git history, source export committed to repo.

### Explicitly out of scope

- Writing actual inspection reports.
- Scheduling.
- Payments.
- Homeowner-facing reports or portals.
- Mobile application.
- Rebuilding the complete Hive Inspect product.
- Unnecessary authentication/permissions complexity unless needed for deployment.

---

## 3. Real Input Examined

File:

`InterNACHI Residential -2026-09-14.xls`

Observed structure:

- 1 worksheet: `Sheet1`
- 392 data rows
- 42 columns
- 13 unique section names
- 61 unique item names
- 334 unique comment names
- 309 rows contain comment text
- 392 rows contain a comment type
- Comment types present: `info`, `limit`, `defect`
- Answer types present in this export:
  - `boolean`: 315
  - `checkbox`: 72
  - `number`: 4
  - `text`: 1
- Multiple-choice option strings occur on 72 rows.
- Numeric unit option strings occur on 3 rows.
- Recommendation values occur on 4 rows.
- Category values are present on 302 rows; observed values are `0` and `1` (90 rows have no category).
- `Default Value` is populated on 1 row.
- `Default Value 2` is empty in this export.
- `Default Unit Type` is empty in this export.
- `Default Location` is empty in this export.
- `Locked` is empty in this export.
- `Simple Format` is empty in this export.
- `Disable Photos` is empty in this export.
- All ten default-photo columns are empty in this export.
- `Uses` is `0` across the export.
- `Default Estimate Min` is populated across all rows.
- `Default Estimate Max` is populated across all rows.
- `Last Modified` is populated across all rows.

### Important observed content behavior

The export contains HTML/HTML entities in content. Examples observed include:

- `&amp;` in names/content.
- `<p>...</p>` in some comment text.

Therefore HTML must not be blindly discarded. The implementation should preserve supported rich content safely and distinguish preservation limits from missing source data.

---

## 4. Input Columns

The parser must recognize these source columns:

1. `Section Name`
2. `Item Name`
3. `Comment Name`
4. `Comment Text`
5. `Comment Type (info, limit, defect)`
6. `Category (-1: Low, 0: Med, 1: High)`
7. `Multiple Choice Options (comma-separated)`
8. `Unit Type Options (numeric answers only, comma-separated)`
9. `Recommendation (from list)`
10. `Order (w/i item)`
11. `Answer Type (boolean, checkbox, date, number, range, text)`
12. `Default Value`
13. `Default Value 2 (for "range" types)`
14. `Default Unit Type (for "number" and "range" types)`
15. `Default Location`
16. `Default Estimate Min`
17. `Default Estimate Max`
18. `Locked`
19. `Simple Format`
20. `Disable Photos`
21. `Uses`
22–41. `Default Photo 1..10` and corresponding captions
42. `Last Modified`

The parser should not assume that only currently populated columns will matter for a future export.

---

## 5. Core Data Model

The data model should be normalized enough that individual sections/items/comments are independently editable.

### Template

```text
id
name
source_format
source_filename
created_at
updated_at
```

### Section

```text
id
template_id
name
description (nullable)
position
created_at
updated_at
```

### Item

```text
id
section_id
name
position
created_at
updated_at
```

### Field / Comment

A row in the Spectora export represents a field/comment-like unit under an item.

```text
id
item_id
name
text_html (nullable)
comment_type
category (nullable)
answer_type
position
default_value (nullable)
default_value_2 (nullable)
default_unit_type (nullable)
default_location (nullable)
estimate_min (nullable)
estimate_max (nullable)
locked (nullable)
simple_format (nullable)
disable_photos (nullable)
uses (nullable)
recommendation (nullable)
source_last_modified (nullable)
created_at
updated_at
```

### Field options

For rows containing multiple-choice options:

```text
id
field_id
label
position
```

### Unit options

For numeric/range unit choices:

```text
id
field_id
label
position
```

### Import issues

```text
id
template_id
severity
row_number
source_column (nullable)
message
raw_value (nullable)
created_at
```

This gives us a durable record of things that could not be fully mapped.

---

## 6. Why This Model

The assignment explicitly rejects storing the whole template as one opaque HTML blob.

The model therefore separates:

```text
Template
  -> Section
      -> Item
          -> Field/Comment
              -> Options
              -> Unit options
```

This makes it possible to:

- rename one section without rewriting the whole template;
- rename one item;
- edit individual comment text;
- preserve item order;
- duplicate a template;
- validate individual imported rows;
- report unsupported content;
- render a structured editor.

The exact database implementation can use separate tables or equivalent normalized structures, but the semantics above must remain.

---

## 7. Import Mapping

### Section

`Section Name` maps to a `Section`.

Rows with the same section name belong to the same section.

The first-seen/source order must be preserved.

### Item

`Item Name` maps to an `Item` within its section.

Rows with the same `(Section Name, Item Name)` belong to the same item.

The first-seen section/item hierarchy must be preserved.

### Field/comment

Each source row maps to one field/comment record under its item.

`Comment Name` -> field name.

`Comment Text` -> rich-text/comment content.

`Comment Type` -> field classification (`info`, `limit`, `defect`).

`Answer Type` -> supported field type.

`Order (w/i item)` -> field ordering within the item.

### Multiple choice

`Multiple Choice Options (comma-separated)` is split into ordered options.

Whitespace should be normalized only where safe; option labels themselves must not be rewritten.

### Numeric units

`Unit Type Options (numeric answers only, comma-separated)` is split into ordered unit options.

### Metadata

The remaining populated source columns should be retained where the schema supports them.

Metadata that is not currently exposed in the editor can remain persisted as structured field metadata rather than being discarded.

---

## 8. Ordering Rules

Ordering is part of preservation.

The importer must preserve:

1. Section order.
2. Item order within each section.
3. Field/comment order within each item.

`Order (w/i item)` is explicitly available for field ordering.

Where the export does not provide a reliable order for a particular hierarchy level, preserve source first-seen order and document that decision.

Do not alphabetically sort imported content unless the source itself is ordered that way.

---

## 9. Rich Text, HTML, and Links

### Required behavior

The importer must not silently strip HTML from `Comment Text`.

If a comment contains supported HTML, preserve it as HTML/rich content.

Examples from the actual export include paragraph markup and HTML entities.

### Safety

When rendering imported HTML in the application:

- sanitize HTML;
- do not execute scripts;
- do not allow unsafe event-handler attributes;
- preserve safe formatting where practical.

### Links

If links occur in supported HTML, preserve their destination and visible text where possible.

If a specific HTML construct cannot be safely/renderably supported, keep the original source information available to the importer diagnostics and create an import issue.

### Important distinction

The UI/NOTES must distinguish:

**Missing from export**
> The source file did not contain the information.

from:

**Unsupported by importer**
> The source contained the information, but this implementation cannot represent it yet.

This distinction is required for trustworthy migration.

---

## 10. Answer Types

The actual export currently contains:

- `boolean`
- `checkbox`
- `number`
- `text`

The source column advertises additional possible values (`date`, `range`), so the parser should recognize them as valid source concepts even though this specific file does not contain them.

### Strategy

Implement a typed internal representation:

```text
boolean
checkbox
number
text
date
range
```

For source types not supported by the UI yet:

- preserve their source type in the database;
- mark the field as partially supported/unsupported for editing if necessary;
- create a visible import issue;
- never silently convert it to an unrelated type.

---

## 11. Import Validation

Validation must happen before/while persistence.

Examples:

- Missing `Section Name` -> import issue.
- Missing `Item Name` -> import issue.
- Missing `Comment Name` -> import issue or generated stable fallback only if explicitly documented.
- Unknown `Comment Type` -> import issue.
- Unknown `Answer Type` -> import issue.
- Malformed option list -> import issue.
- Invalid numeric estimate -> import issue.
- Invalid ordering value -> import issue.
- Unsupported HTML -> import issue.

### Important rule

A bad row should not necessarily abort the entire import.

Prefer:

```text
392 rows read
389 fully imported
3 partially supported
0 silently dropped
```

with the exact issues visible to the user.

A fatal error should be reserved for situations where the file cannot be parsed at all.

---

## 12. Import Summary UI

After import, show a trustworthy summary such as:

```text
Import complete

Sections: 13
Items: 61
Fields: 392

Fully imported: 389
Warnings: 3

[View warnings]
[Open template]
```

The exact numbers must be calculated from the actual import result, not hardcoded.

The summary should make skipped/unsupported content discoverable.

---

## 13. Editor Requirements

The editor must support at minimum:

### Section

- Rename section.
- Save change.

### Item

- Rename item.
- Save change.

### Comment/field

- Edit comment text.
- Save change.

### Additional useful editing

If time allows, expose answer type/options and other metadata, but do not delay the baseline for unnecessary editor breadth.

The assignment asks us to decide how much further the editor should go. Prioritize the three explicit editing requirements first.

---

## 14. Persistence

All templates and edits must live in a real backend.

Recommended stack:

- PostgreSQL through Supabase.
- Server/API layer using the selected web framework.
- No browser-only source of truth.

Acceptance test:

1. Import template.
2. Edit a section/item/comment.
3. Save.
4. Close/reload application.
5. Open template.
6. Confirm change remains.

---

## 15. Duplication Semantics

Duplicate must create an independent template graph.

Conceptually:

```text
Original Template
  -> Sections
      -> Items
          -> Fields
              -> Options

             DUPLICATE

Copy Template
  -> copied Sections
      -> copied Items
          -> copied Fields
              -> copied Options
```

The copy must have new database identities.

Acceptance test:

1. Import/open original.
2. Duplicate it.
3. Rename an item in the copy.
4. Save.
5. Open original.
6. Original remains unchanged.
7. Reopen copy.
8. Copy contains the edit.

Do not use shared mutable child records in a way that causes copy edits to leak back into the original.

---

## 16. Idempotency / Re-import Consideration

The baseline does not require sophisticated synchronization between an existing template and a later source export.

However, the importer should be written as a reusable parser rather than hardcoded around the committed file.

A second Spectora HTML-text export with the same general column structure should be accepted.

Do not hardcode:

- exact section names;
- exact row counts;
- exact item names;
- exact number of options.

---

## 17. Testing Strategy

### Parser tests

Use fixtures derived from the committed Spectora export.

Test:

- section grouping;
- item grouping;
- field extraction;
- ordering;
- comment type;
- answer type;
- option splitting;
- unit splitting;
- HTML preservation;
- HTML entities;
- missing values;
- unsupported types;
- malformed rows.

### Persistence tests

Test:

- create template;
- save edits;
- reload;
- duplicate;
- edit duplicate;
- original remains unchanged.

### Preservation check

Create an import verification report or test that compares source rows with imported records.

At minimum verify:

```text
source section/item hierarchy
source field names
source comment text
source ordering
source answer types
source options
```

The goal is not byte-for-byte equality of the entire spreadsheet. The goal is demonstrable semantic preservation.

---

## 18. Failure Case to Demonstrate in Walkthrough

We need at least one visible failure/limitation case.

Preferred demonstration:

1. Use a row/fixture with unsupported or malformed content.
2. Import continues.
3. UI reports the issue.
4. The affected content is identifiable.
5. No unrelated imported content disappears.

Explain:

> "I chose to surface this rather than silently dropping it because migration trust is more important than pretending the importer supports everything."

If the real export does not naturally contain a suitable malformed case, create a small test fixture or controlled copy for the failure test and clearly label it as a test case.

---

## 19. One Improvement Beyond Baseline

After the baseline works, implement **one** improvement.

Preferred direction:

### Import trust / transparency

Make the import result unusually clear:

- counts;
- warning count;
- unsupported content;
- source row references;
- preserved vs unsupported distinction.

Reason:

A company migrating a four-year-old template is primarily afraid that something they rely on will disappear.

This improvement directly addresses that customer fear.

Do not add several unrelated features.

---

## 20. Recommended Application Structure

Exact framework is flexible. Use the stack that is fastest and easiest to explain.

Suggested logical structure:

```text
app/
  import/
  templates/
  api/

components/
  template-tree/
  template-editor/
  import-summary/

lib/
  importer/
    parser
    mapper
    validator
    html
  db/
  duplication/

tests/
  importer/
  persistence/
  duplication/

supabase/
  migrations/

fixtures/
  InterNACHI Residential -2026-09-14.xls

PROJECT_SPEC.md
README.md
NOTES.md
```

The actual framework can differ.

---

## 21. AI Coding Tools

AI coding tools are explicitly encouraged.

Use Cursor/Claude/Copilot/etc. as implementation assistants.

Rules:

- Understand generated code before shipping it.
- Validate database migrations.
- Test parser behavior against the real export.
- Do not accept invented Spectora mappings without checking the source.
- Keep reusable prompts/scripts/agent instructions in the repo if they materially contributed.
- Credit existing libraries/starters.

For this project, deterministic parsing is preferred over LLM-based mapping because the source already exposes structured columns.

---

## 22. Acceptance Criteria

The project is considered baseline-complete when all of the following work:

### Import

- [ ] User uploads the committed Spectora HTML-text spreadsheet.
- [ ] Import succeeds.
- [ ] Sections are structured.
- [ ] Items are structured.
- [ ] Fields/comments are structured.
- [ ] Source ordering is preserved.
- [ ] Text is preserved.
- [ ] Supported rich text is preserved.
- [ ] Unsupported content is visible.

### Edit

- [ ] Section name can be changed.
- [ ] Item name can be changed.
- [ ] Comment text can be changed.
- [ ] Changes save to backend.
- [ ] Changes survive reload.

### Duplicate

- [ ] Template can be duplicated.
- [ ] Copy has independent child records.
- [ ] Copy edits do not change original.

### Persistence

- [ ] Database is real.
- [ ] Browser storage is not the source of truth.
- [ ] Imported template is available after reopening.

### Trust

- [ ] Import summary exists.
- [ ] Failure/unsupported case is visible.
- [ ] Missing source data is distinguished from importer limitations.

### Deployment

- [ ] App is publicly accessible.
- [ ] Live app opens with an imported template.
- [ ] Credentials are not committed.

---

## 23. Deliberately Not Building

To protect the two-day scope:

- Full inspection-report authoring.
- Scheduling.
- Payments.
- Homeowner portal.
- Mobile UI.
- Full Hive feature parity.
- Complex user roles.
- Full media/photo management.
- Every possible Spectora feature.
- AI mapping when deterministic mapping is sufficient.

These can be explicitly documented as deliberate cuts.

---

## 24. Walkthrough Narrative

The demo should tell one coherent story:

### 1. Problem

> "Inspectors have years of template customization in Spectora. Recreating it manually is unacceptable."

### 2. Import

Upload the actual committed Spectora export.

Show:

- import progress/result;
- counts;
- warnings if any.

### 3. Structure

Open the imported template and show:

```text
Section
  -> Item
      -> Field/comment
```

### 4. Edit

Rename a section/item and change comment text.

Save.

Reload.

Show that the change remains.

### 5. Duplicate

Duplicate the template.

Change the copy.

Open original.

Show original is unchanged.

### 6. Architecture

Explain:

- parser;
- mapper;
- database;
- editor;
- duplication.

### 7. Hard part

Show the hardest import issue and the chosen behavior.

### 8. Tradeoffs

Explain what was deliberately not built.

### 9. Hive feedback

Give direct, specific feedback based on actual product exploration.

---

## 25. Engineering Principles

1. **Preservation over originality.**
2. **Structured data over opaque blobs.**
3. **Deterministic import over unnecessary AI inference.**
4. **Visible failure over silent loss.**
5. **Real persistence over browser storage.**
6. **Independent copies over shared mutable state.**
7. **Small complete workflow over broad incomplete product.**
8. **Build from the actual export, not assumptions.**

---

## 26. Immediate Build Order

Do not ask an AI coding agent to generate the entire application blindly.

Build in this order:

```text
1. Inspect/fixture the real export
2. Database schema + migration
3. Parser
4. Mapper + validation
5. Import API
6. Import summary
7. Template tree/editor
8. Save edits
9. Duplicate template
10. Failure/unsupported-content UI
11. Tests
12. Seed data
13. Deployment
14. README + NOTES.md
15. Walkthrough
```

The first coding milestone is:

> **Given the committed Spectora export, produce a validated structured template object with preserved hierarchy, order, fields, options, and rich text, plus explicit import issues.**

Everything else should be built on top of that contract.
