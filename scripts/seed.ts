import { config } from "dotenv";
import { closeDb } from "../src/lib/db/client";
import { resetDemoStore } from "../src/lib/store";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const result = await resetDemoStore();
  console.log("Seeded demo operator:", result);
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
