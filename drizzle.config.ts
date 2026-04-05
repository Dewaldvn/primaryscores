import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not load .env.local — match scripts/seed.ts behaviour
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
