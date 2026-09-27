import { readFileSync } from "node:fs";
import { assessKasandrinosIntake, formatKasandrinosIntakeReport, parseKasandrinosPacket } from "../src/domain/kasandrinos-intake";

if (process.argv.includes("--apply")) {
  process.stderr.write("This intake cannot apply records. Nomination facts, an olive oil lane, independent sampling, and a TECRID record are missing.\n");
  process.exit(2);
}

const raw: unknown = JSON.parse(readFileSync(new URL("../fixtures/kasandrinos/light-labs-certificates.json", import.meta.url), "utf8"));
const packet = parseKasandrinosPacket(raw);
const assessment = assessKasandrinosIntake(packet);
process.stdout.write(formatKasandrinosIntakeReport(packet, assessment));
if (assessment.databaseWrite || assessment.persistedRecords !== 0) process.exit(1);
