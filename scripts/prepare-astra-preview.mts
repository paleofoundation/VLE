import {readFile} from "node:fs/promises";
import {neon} from "@neondatabase/serverless";
import {previewDatabaseConfiguration,migrationStatement,previewSetupError,type PreviewStatement} from "../src/db/astra-preview";
import {suppliers,profileDocuments} from "../src/content/fieldwork/catalog";
import {reportDateFields} from "../src/domain/public-listings";

async function prepare(){
 const config=previewDatabaseConfiguration(process.env);
 if(!config){console.log("ASTRA preview setup skipped outside the exact preview branch.");return;}
 const schema=config.schema;
 // One HTTPS request, one atomic transaction. No WebSocket or idle Pool exists.
 const sql=neon(config.url);
 const statements:PreviewStatement[]=[
  {text:"SELECT pg_advisory_xact_lock(hashtext('astra-preview-schema-v1'))"},
  {text:`CREATE SCHEMA IF NOT EXISTS "${schema}"`},
  {text:"SELECT set_config('search_path',$1,true)",values:[`${schema},pg_catalog`]},
  {text:`CREATE TABLE IF NOT EXISTS "${schema}".astra_preview_migrations(tag text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())`},
 ];
 const journal=JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json",import.meta.url),"utf8")) as {entries:{tag:string}[]};
 for(const entry of journal.entries)statements.push(migrationStatement(entry.tag,await readFile(new URL(`../drizzle/${entry.tag}.sql`,import.meta.url),"utf8")));
 // Seed only the approved roster and Kasandrinos documents. No public data or roles are read or copied.
 for(const supplier of suppliers){
  statements.push({text:`INSERT INTO "${schema}".supplier_profiles(slug,display_name,country,website,categories,certifications_shown) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,values:[supplier.slug,supplier.name,supplier.country,supplier.website,[supplier.category],supplier.certifications||null]});
  const documents=[...supplier.documents,...profileDocuments(supplier)].filter((d,i,all)=>all.findIndex(other=>other.url===d.url)===i);
  for(const document of documents){
   const date=reportDateFields(document.date);
   statements.push({text:`INSERT INTO "${schema}".public_documents(supplier_profile_id,product_name,tests_text,doc_type,lab_name,report_date,report_date_text,source_url,source_domain,source_page_url,found_at) SELECT id,$2,$3,'Other',$4,$5,$6,$7,$8,$9,'2026-10-19' FROM "${schema}".supplier_profiles WHERE slug=$1 AND listing_source='PUBLIC_DOCUMENTS' AND claim_status='UNCLAIMED' AND organization_id IS NULL AND NOT hidden AND NOT moderation_hidden ON CONFLICT DO NOTHING`,values:[supplier.slug,document.product,document.title,document.lab||null,date.reportDate,date.reportDateText,document.url,document.domain,document.source]});
  }
 }
 statements.push({text:`SELECT count(*)::int AS applied FROM "${schema}".astra_preview_migrations`});
 const results=await sql.transaction(statements.map(s=>sql.query(s.text,s.values??[])),{fetchOptions:{signal:AbortSignal.timeout(90000)}});
 const applied=results.at(-1)?.[0]?.applied;
 if(applied!==journal.entries.length)throw new Error("Preview migration ledger is incomplete");
 console.log(`ASTRA ALL isolated preview schema is ready: ${schema}; ${applied} migrations confirmed. No public schema was read or migrated.`);
}
try{await prepare();}catch(error){console.error(previewSetupError(error));process.exitCode=1;}
