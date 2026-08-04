import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __rezervoSql: ReturnType<typeof postgres> | undefined;
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Use the Supabase Transaction pooler URL (port 6543). See .env.example",
    );
  }
  return url;
}

function getSql() {
  if (!globalThis.__rezervoSql) {
    globalThis.__rezervoSql = postgres(requireDatabaseUrl(), {
      prepare: false,
      max: 10,
    });
  }
  return globalThis.__rezervoSql;
}

export function getDb() {
  return drizzle(getSql(), { schema });
}

export async function closeDb() {
  if (globalThis.__rezervoSql) {
    await globalThis.__rezervoSql.end({ timeout: 5 });
    globalThis.__rezervoSql = undefined;
  }
}
