CREATE TABLE "field_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"field_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_unit_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"field_id" uuid NOT NULL,
	"label" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"name" text NOT NULL,
	"text_html" text,
	"comment_type" text NOT NULL,
	"category" integer,
	"answer_type" text NOT NULL,
	"position" integer NOT NULL,
	"source_order" integer,
	"source_row_number" integer NOT NULL,
	"default_value" text,
	"default_value_2" text,
	"default_unit_type" text,
	"default_location" text,
	"estimate_min" integer,
	"estimate_max" integer,
	"locked" text,
	"simple_format" text,
	"disable_photos" text,
	"uses" text,
	"recommendation" text,
	"source_last_modified" text,
	"photos_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"support_status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_issues" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"severity" text NOT NULL,
	"row_number" integer,
	"source_column" text,
	"message" text NOT NULL,
	"raw_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"section_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"source_format" text NOT NULL,
	"source_filename" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "field_options" ADD CONSTRAINT "field_options_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_unit_options" ADD CONSTRAINT "field_unit_options_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;