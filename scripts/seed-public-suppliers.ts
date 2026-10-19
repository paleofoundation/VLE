import { readFile } from "node:fs/promises";
import { getDb } from "../src/db";
import { publicDocuments, supplierProfiles } from "../src/db/schema";
import { parseRoster, rosterDocument, supplierSlug } from "../src/domain/public-listings";

async function seed() {
  const rows = parseRoster(await readFile(new URL("../data/seed/supplier-roster-2026-10-19.csv", import.meta.url), "utf8"));
  await getDb().transaction(async (tx) => {
    for (const name of new Set(rows.map((r) => r.company))) {
      const records = rows.filter((r) => r.company === name); const first = records[0];
      const values = { slug: supplierSlug(name), displayName: name, country: first.country || null, website: first.website || null, categories: [...new Set(records.map((r) => r.category).filter(Boolean))], certificationsShown: [...new Set(records.map((r) => r.certifications_shown).filter(Boolean))].join("; ") || null };
      // Never overwrite a claimed or member profile, nor unhide a removed listing.
      const [profile] = await tx.insert(supplierProfiles).values(values).onConflictDoNothing({ target: supplierProfiles.slug }).returning();
      const existing = profile ?? await tx.query.supplierProfiles.findFirst({ where: (t, { eq }) => eq(t.slug, values.slug) });
      if (!existing || existing.listingSource !== "PUBLIC_DOCUMENTS" || existing.claimStatus !== "UNCLAIMED" || existing.organizationId) continue;
      for (const row of records) await tx.insert(publicDocuments).values({ supplierProfileId: existing.id, ...rosterDocument(row) }).onConflictDoNothing();
    }
  });
  console.log(`Imported ${rows.length} roster document rows without overwriting existing records.`);
}
seed().then(() => process.exit(0)).catch((error) => { console.error(error instanceof Error ? error.message : "Seed failed"); process.exit(1); });
