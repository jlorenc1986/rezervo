import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config({ path: ".env.local" });
config({ path: ".env" });

const localTestDb = "postgresql://rezervo:rezervo@127.0.0.1:54329/rezervo";
// Never hit the production pooler from .env.local: resetDemoStore wipes demo rows.
if (!process.env.CI) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? localTestDb;
} else if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = localTestDb;
}

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
});
