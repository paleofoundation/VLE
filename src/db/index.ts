import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import {scopedDatabaseUrl} from "./preview-scope";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return drizzle(new Pool({ connectionString: scopedDatabaseUrl(databaseUrl,process.env) }), { schema });
}

let instance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  instance ??= createDb();
  return instance;
}
