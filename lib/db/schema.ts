import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { PhotoSlot } from "@/lib/importer/types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
};

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  sourceFormat: text("source_format").notNull(),
  sourceFilename: text("source_filename").notNull(),
  ...timestamps,
});

export const sections = pgTable("sections", {
  id: uuid("id").primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").notNull(),
  ...timestamps,
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey(),
  sectionId: uuid("section_id")
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  ...timestamps,
});

export const fields = pgTable("fields", {
  id: uuid("id").primaryKey(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  textHtml: text("text_html"),
  commentType: text("comment_type").notNull(),
  category: integer("category"),
  answerType: text("answer_type").notNull(),
  position: integer("position").notNull(),
  sourceOrder: integer("source_order"),
  sourceRowNumber: integer("source_row_number").notNull(),
  defaultValue: text("default_value"),
  defaultValue2: text("default_value_2"),
  defaultUnitType: text("default_unit_type"),
  defaultLocation: text("default_location"),
  estimateMin: integer("estimate_min"),
  estimateMax: integer("estimate_max"),
  locked: text("locked"),
  simpleFormat: text("simple_format"),
  disablePhotos: text("disable_photos"),
  uses: text("uses"),
  recommendation: text("recommendation"),
  sourceLastModified: text("source_last_modified"),
  photosJson: jsonb("photos_json").$type<PhotoSlot[]>().notNull().default([]),
  supportStatus: text("support_status").notNull(),
  ...timestamps,
});

export const fieldOptions = pgTable("field_options", {
  id: uuid("id").primaryKey(),
  fieldId: uuid("field_id")
    .notNull()
    .references(() => fields.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull(),
});

export const fieldUnitOptions = pgTable("field_unit_options", {
  id: uuid("id").primaryKey(),
  fieldId: uuid("field_id")
    .notNull()
    .references(() => fields.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull(),
});

export const importIssues = pgTable("import_issues", {
  id: uuid("id").primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  severity: text("severity").notNull(),
  rowNumber: integer("row_number"),
  sourceColumn: text("source_column"),
  message: text("message").notNull(),
  rawValue: text("raw_value"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const templatesRelations = relations(templates, ({ many }) => ({
  sections: many(sections),
  issues: many(importIssues),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  template: one(templates, {
    fields: [sections.templateId],
    references: [templates.id],
  }),
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  section: one(sections, {
    fields: [items.sectionId],
    references: [sections.id],
  }),
  fields: many(fields),
}));

export const fieldsRelations = relations(fields, ({ one, many }) => ({
  item: one(items, {
    fields: [fields.itemId],
    references: [items.id],
  }),
  options: many(fieldOptions),
  unitOptions: many(fieldUnitOptions),
}));

export const fieldOptionsRelations = relations(fieldOptions, ({ one }) => ({
  field: one(fields, {
    fields: [fieldOptions.fieldId],
    references: [fields.id],
  }),
}));

export const fieldUnitOptionsRelations = relations(fieldUnitOptions, ({ one }) => ({
  field: one(fields, {
    fields: [fieldUnitOptions.fieldId],
    references: [fields.id],
  }),
}));

export const importIssuesRelations = relations(importIssues, ({ one }) => ({
  template: one(templates, {
    fields: [importIssues.templateId],
    references: [templates.id],
  }),
}));

export const schema = {
  templates,
  sections,
  items,
  fields,
  fieldOptions,
  fieldUnitOptions,
  importIssues,
  templatesRelations,
  sectionsRelations,
  itemsRelations,
  fieldsRelations,
  fieldOptionsRelations,
  fieldUnitOptionsRelations,
  importIssuesRelations,
};
