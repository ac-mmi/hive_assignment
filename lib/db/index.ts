import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | undefined;
let db: Database | undefined;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure a PostgreSQL connection (Supabase or local) before importing templates.",
    );
  }
  return url;
}

export function getDb(): Database {
  if (db) return db;
  const serverless = Boolean(process.env.VERCEL);
  client = postgres(getDatabaseUrl(), {
    max: serverless ? 1 : 4,
    idle_timeout: 20,
    connect_timeout: 10,
    // Transaction poolers (Supabase :6543 / PgBouncer) reject prepared statements.
    prepare: false,
  });
  db = drizzle(client, { schema });
  return db;
}
