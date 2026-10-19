import {readFile} from "node:fs/promises";
import {Pool} from "@neondatabase/serverless";
import {ASTRA_PREVIEW_SCHEMA,astraPreviewSchema,scopedDatabaseUrl} from "../src/db/preview-scope";
import {suppliers,profileDocuments} from "../src/content/fieldwork/catalog";
import {reportDateFields} from "../src/domain/public-listings";

const schema=astraPreviewSchema(process.env);
if(schema){
 if(schema!==ASTRA_PREVIEW_SCHEMA||!process.env.DATABASE_URL)throw new Error("Isolated ASTRA preview configuration is incomplete");
 const pool=new Pool({connectionString:scopedDatabaseUrl(process.env.DATABASE_URL,process.env)});
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('astra-preview-schema-v1'))");
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}", pg_catalog`);
  await client.query("CREATE TABLE IF NOT EXISTS astra_preview_migrations(tag text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const journal=JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json",import.meta.url),"utf8")) as {entries:{tag:string}[]};
  for(const entry of journal.entries){
   if((await client.query("SELECT tag FROM astra_preview_migrations WHERE tag=$1",[entry.tag])).rows.length)continue;
   const migration=(await readFile(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),"utf8")).replaceAll('"public".',`"${schema}".`);
   for(const statement of migration.split("--> statement-breakpoint").filter(s=>s.trim()))await client.query(statement);
   await client.query("INSERT INTO astra_preview_migrations(tag) VALUES($1)",[entry.tag]);
  }
  // Preserve only pre-existing operations access. No new role or identity is invented.
  await client.query(`INSERT INTO organizations(id,name,slug,kind,created_at) SELECT o.id,o.name,o.slug,o.kind::text::"${schema}".organization_kind,o.created_at FROM public.organizations o WHERE o.id IN(SELECT organization_id FROM public.memberships WHERE role::text IN('OPS','ADMIN')) ON CONFLICT DO NOTHING`);
  await client.query("INSERT INTO users(id,clerk_user_id,email,display_name,created_at) SELECT u.id,u.clerk_user_id,u.email,u.display_name,u.created_at FROM public.users u WHERE u.id IN(SELECT user_id FROM public.memberships WHERE role::text IN('OPS','ADMIN')) ON CONFLICT DO NOTHING");
  await client.query(`INSERT INTO memberships(id,user_id,organization_id,role,created_at) SELECT id,user_id,organization_id,role::text::"${schema}".role,created_at FROM public.memberships WHERE role::text IN('OPS','ADMIN') ON CONFLICT DO NOTHING`);
  for(const s of suppliers){
   await client.query("INSERT INTO supplier_profiles(slug,display_name,country,website,categories,certifications_shown) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",[s.slug,s.name,s.country,s.website,[s.category],s.certifications||null]);
   const {rows:[profile]}=await client.query("SELECT id,listing_source,claim_status,organization_id,hidden,moderation_hidden FROM supplier_profiles WHERE slug=$1",[s.slug]);
   if(!profile||profile.listing_source!=="PUBLIC_DOCUMENTS"||profile.claim_status!=="UNCLAIMED"||profile.organization_id||profile.hidden||profile.moderation_hidden)continue;
   const docs=[...s.documents,...profileDocuments(s)].filter((d,i,all)=>all.findIndex(other=>other.url===d.url)===i);
   for(const d of docs){
    const date=reportDateFields(d.date);
    await client.query("INSERT INTO public_documents(supplier_profile_id,product_name,tests_text,doc_type,lab_name,report_date,report_date_text,source_url,source_domain,source_page_url,found_at) VALUES($1,$2,$3,'Other',$4,$5,$6,$7,$8,$9,'2026-10-19') ON CONFLICT DO NOTHING",[profile.id,d.product,d.title,d.lab||null,date.reportDate,date.reportDateText,d.url,d.domain,d.source]);
   }
  }
  await client.query("COMMIT");
  console.log("ASTRA ALL isolated preview schema is ready. Production schemas were not migrated.");
 }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();await pool.end();}
}else{console.log("ASTRA preview setup skipped outside the exact preview branch.");}
