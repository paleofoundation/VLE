export const ASTRA_PREVIEW_SCHEMA="vle_astra_all_preview_v1";
type Environment=Record<string,string|undefined>;
export function astraPreviewSchema(env:Environment){return env.VERCEL_ENV==="preview"&&env.VERCEL_GIT_COMMIT_REF==="codex/vle-astra-all"?ASTRA_PREVIEW_SCHEMA:null;}
export function scopedDatabaseUrl(value:string,env:Environment){const schema=astraPreviewSchema(env);if(!schema)return value;const url=new URL(value);url.searchParams.set("options",`-c search_path=${schema},pg_catalog`);return url.href;}
