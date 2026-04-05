import { config } from "dotenv";
import { resolve } from "path";

// Base defaults from .env, then .env.local wins (overrides shell/CI DATABASE_URL mistakes).
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });
