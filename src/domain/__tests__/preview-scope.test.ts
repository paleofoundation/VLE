import {it,expect} from "vitest";
import {astraPreviewSchema,scopedDatabaseUrl,ASTRA_PREVIEW_SCHEMA} from "../../db/preview-scope";
it("scopes only the exact ASTRA ALL preview branch",()=>{
 const url="postgresql://user:password@example.test/db?sslmode=require";
 for(const env of [{},{VERCEL_ENV:"production",VERCEL_GIT_COMMIT_REF:"codex/vle-astra-all"},{VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"main"},{VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"codex/vle-astra-h"}]){expect(astraPreviewSchema(env)).toBeNull();expect(scopedDatabaseUrl(url,env)).toBe(url);}
 const scoped=new URL(scopedDatabaseUrl(url,{VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"codex/vle-astra-all"}));expect(scoped.searchParams.get("options")).toBe(`-c search_path=${ASTRA_PREVIEW_SCHEMA},pg_catalog`);expect(scoped.searchParams.get("sslmode")).toBe("require");
});
