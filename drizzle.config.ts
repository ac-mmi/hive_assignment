import { defineConfig } from "drizzle-kit";

// Fallback is local Docker only, for `drizzle-kit generate` without loading .env.local.
// Runtime never uses this file; the app requires DATABASE_URL.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://hive:hive@127.0.0.1:5432/hive",
  },
});
