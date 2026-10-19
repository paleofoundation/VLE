import {ASTRA_PREVIEW_SCHEMA,astraPreviewSchema} from "./preview-scope";
export type PreviewStatement={text:string;values?:unknown[]};
export function previewDatabaseConfiguration(env:Record<string,string|undefined>){
 if(!astraPreviewSchema(env))return null;
 const key=["ASTRA_PREVIEW_DATABASE_URL","DATABASE_URL_UNPOOLED","DATABASE_URL"].find(key=>env[key]);
 if(!key)throw new Error("Configure ASTRA_PREVIEW_DATABASE_URL, DATABASE_URL_UNPOOLED or DATABASE_URL for the codex/vle-astra-all Preview environment.");
 const value=env[key]!;let url:URL;
 try{url=new URL(value);}catch{throw new Error(`${key} must be a valid Neon PostgreSQL connection URL.`);}
 if(!["postgres:","postgresql:"].includes(url.protocol)||!url.username||!url.password||url.pathname.length<2||!url.hostname.endsWith(".neon.tech"))throw new Error(`${key} must contain the Neon hostname, database name, user and password.`);
 // HTTP transactions set their search path locally. Never inherit a connection's path.
 url.searchParams.delete("options");
 return {key,url:url.href,schema:ASTRA_PREVIEW_SCHEMA};
}
export function migrationStatement(tag:string,source:string):PreviewStatement{
 if(!/^\d{4}_[a-z0-9_-]+$/.test(tag))throw new Error("Invalid preview migration tag");
 const schema=ASTRA_PREVIEW_SCHEMA;
 const migration=source.replaceAll('"public".',`"${schema}".`);
 if(/\bpublic\s*\./i.test(migration)||/"public"\s*\./i.test(migration))throw new Error("Preview migrations must not reference public schemas");
 const literal=(s:string)=>`'${s.replaceAll("'","''")}'`;
 const commands=migration.split("--> statement-breakpoint").filter(s=>s.trim()).map(s=>`EXECUTE ${literal(s)};`).join("\n");
 return {text:`DO $astra_migration$ BEGIN IF NOT EXISTS(SELECT 1 FROM "${schema}".astra_preview_migrations WHERE tag=${literal(tag)}) THEN ${commands} INSERT INTO "${schema}".astra_preview_migrations(tag) VALUES(${literal(tag)}); END IF; END $astra_migration$`};
}
export function previewSetupError(error:unknown){
 const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"";
 if(code==="42501")return `ASTRA ALL preview database setup failed: the configured database role needs CREATE on the database and ownership of ${ASTRA_PREVIEW_SCHEMA}. Configure ASTRA_PREVIEW_DATABASE_URL with the isolated-preview migration role. No public schema is migrated.`;
 if(code&&/^\d{2}[A-Z0-9]{3}$/.test(code))return `ASTRA ALL isolated preview setup failed (PostgreSQL ${code}). Check ASTRA_PREVIEW_DATABASE_URL (or DATABASE_URL_UNPOOLED / DATABASE_URL), database credentials, and migration permissions for ${ASTRA_PREVIEW_SCHEMA}. The setup transaction was rolled back. No public schema is migrated.`;
 if(error instanceof Error&&/^Configure |must be|.*must contain|.*must be a valid/.test(error.message))return `ASTRA ALL preview configuration missing or invalid: ${error.message}`;
 return "ASTRA ALL preview database could not be reached over HTTPS. Configure ASTRA_PREVIEW_DATABASE_URL (or DATABASE_URL_UNPOOLED / DATABASE_URL) for this Preview branch and allow HTTPS access to its Neon SQL endpoint. The isolated schema was not prepared; the build has stopped. No public schema is migrated.";
}
