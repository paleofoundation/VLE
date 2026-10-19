import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {describe,it,expect} from "vitest";
import {migrationStatement,previewDatabaseConfiguration,previewSetupError} from "../../db/astra-preview";
import {ASTRA_PREVIEW_SCHEMA} from "../../db/preview-scope";
import {sourcingFaqSchema} from "../sourcing-faq";
import {normalizeCategory} from "../market-search";
describe("ASTRA ALL isolated preview setup",()=>{
 const env={VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"codex/vle-astra-all"};
 it("requires named connection configuration on this branch only",()=>{
  expect(previewDatabaseConfiguration({})).toBeNull();expect(()=>previewDatabaseConfiguration(env)).toThrow("ASTRA_PREVIEW_DATABASE_URL");
  expect(()=>previewDatabaseConfiguration({...env,DATABASE_URL:"not a URL"})).toThrow("DATABASE_URL must be a valid");
  const configuration=previewDatabaseConfiguration({...env,DATABASE_URL:"postgresql://u:p@ep-example.neon.tech/db",ASTRA_PREVIEW_DATABASE_URL:"postgresql://preview:p@ep-preview.neon.tech/db?options=-c%20search_path%3Dpublic"})!;
  expect(configuration.key).toBe("ASTRA_PREVIEW_DATABASE_URL");expect(new URL(configuration.url).searchParams.has("options")).toBe(false);
 });
 it("rewrites all migration references to the isolated schema and keeps a ledger",()=>{
  const journal=JSON.parse(readFileSync("drizzle/meta/_journal.json","utf8"));
  for(const {tag} of journal.entries){const result=migrationStatement(tag,readFileSync(`drizzle/${tag}.sql`,"utf8"));expect(result.text).not.toMatch(/(?:\bpublic|"public")\s*\./i);expect(result.text).toContain(ASTRA_PREVIEW_SCHEMA);expect(result.text).toContain("IF NOT EXISTS");expect(result.text).toContain("astra_preview_migrations");}
  expect(()=>migrationStatement("bad'; DROP SCHEMA public; --","SELECT 1")).toThrow();
  expect(()=>migrationStatement("0000_test","SELECT * FROM public.users")).toThrow("public schemas");
 });
 it("reports connection and permission failures without leaking raw transport data",()=>{
  const error=new Error("Socket closed at postgresql://user:secret@host/db");const message=previewSetupError(error);expect(message).toContain("ASTRA_PREVIEW_DATABASE_URL");expect(message).toContain("HTTPS");expect(message).not.toContain("secret");expect(message).not.toContain("Socket");
  expect(previewSetupError({code:"42501"})).toContain("CREATE on the database");
 });
});
it("retains the supplied FAQ unchanged and recognizes its category URLs",()=>{
 const bytes=readFileSync("src/content/fieldwork/faq-sourcing.json");
 expect(createHash("sha256").update(bytes).digest("hex")).toBe("c9db0c578a372172a7cb842b696062dfa2383f59ec6e2959425002762e0ca90a");
 const data=sourcingFaqSchema.parse(JSON.parse(bytes.toString()));expect(data.groups).toHaveLength(8);expect(data.groups.flatMap(g=>g.questions)).toHaveLength(37);
 for(const [slug,label] of Object.entries({rice:"Rice",cocoa:"Cocoa",protein:"Protein",spices:"Spices","tea-matcha":"Tea & matcha","olive-oil":"Olive oil","baby-food":"Baby food"}))expect(normalizeCategory(slug)).toBe(label);
});
