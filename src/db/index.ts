import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return drizzle(new Pool({ connectionString: databaseUrl }), { schema });
}

let instance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  instance ??= createDb();
  return instance;
}
