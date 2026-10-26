import {readFileSync} from 'node:fs';

// Explicit opt-in for disposable test databases; importing this module does no work.
export async function seedKasandrinosProofFixture(db) {
  const sql = readFileSync(new URL('../../scripts/seeds/kasandrinos-proof-pilot.sql', import.meta.url), 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    if (statement.trim()) await db.prepare(statement).run();
  }
}
