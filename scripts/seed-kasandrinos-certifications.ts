import { getDb } from "../src/db";
import { supplierCertifications } from "../src/db/schema";
import { kasandrinosCertifications } from "../src/content/suppliers/kasandrinos";
async function seed() {
  const db = getDb(); const profile = await db.query.supplierProfiles.findFirst({ where: (t, { eq }) => eq(t.slug, "kasandrinos") });
  if (!profile) throw new Error("Import the supplier roster first");
  const source = (name: string) => kasandrinosCertifications.find((c) => c.name === name)!.url;
  for (const c of [
    { certificationKey: "USDA Organic", sourceUrl: source("USDA Organic"), certifyingBody: null },
    { certificationKey: "Non-GMO", sourceUrl: source("Non-GMO"), certifyingBody: "Non-GMO Project" },
    { certificationKey: "Kosher", sourceUrl: source("OU Kosher"), certifyingBody: "Orthodox Union" },
    { certificationKey: "Paleo", sourceUrl: source("Paleo Foundation"), certifyingBody: "Paleo Foundation", confirmedAt: "2026-10-19", confirmedIssuer: "Paleo Foundation" },
    { certificationKey: "Keto", sourceUrl: source("Paleo Foundation"), certifyingBody: "Paleo Foundation", confirmedAt: "2026-10-19", confirmedIssuer: "Paleo Foundation" },
  ]) await db.insert(supplierCertifications).values({ ...c, supplierProfileId: profile.id, supplierReported: false }).onConflictDoNothing();
  console.log("Kasandrinos certifications imported without overwriting existing records.");
}
seed().then(() => process.exit(0)).catch(() => { console.error("Certification import failed"); process.exit(1); });
