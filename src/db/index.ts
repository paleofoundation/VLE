import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  // Opt-in loopback transport for a disposable local PostgreSQL test database.
  if (process.env.NODE_ENV !== "production" && process.env.VLE_LOCAL_DB_PROXY === "1" &&
      ["127.0.0.1", "localhost"].includes(new URL(databaseUrl).hostname)) {
    neonConfig.wsProxy = () => "127.0.0.1:55433";
    neonConfig.useSecureWebSocket = false;
    neonConfig.pipelineConnect = false;
  }
  return drizzle(new Pool({ connectionString: databaseUrl }), { schema });
}

let instance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  instance ??= createDb();
  return instance;
}
