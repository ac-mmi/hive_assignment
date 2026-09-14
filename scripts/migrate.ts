import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadLocalEnv } from "./load-env";

async function main() {
  loadLocalEnv();

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./supabase/migrations" });
  await client.end();

  console.log("Migrations applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
