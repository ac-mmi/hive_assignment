import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const filepath = path.join(process.cwd(), filename);
    if (!existsSync(filepath)) continue;
    for (const line of readFileSync(filepath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
