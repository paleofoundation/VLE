import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';
import {Miniflare} from 'miniflare';
import {seedKasandrinosProofFixture} from './support/kasandrinos-proof-fixture.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const proofTables = ['lot_releases', 'lot_tecrids', 'organization_roles', 'proof_audit',
  'proof_certifications', 'proof_delivery_receipts', 'proof_lots', 'proof_organizations',
  'sourcing_decisions', 'lot_tecrid_grants', 'proof_stream_state'];
const mf = new Miniflare({modules:true, script:'export default {fetch(){return new Response("test")}}',
  d1Databases:['DB'], compatibilityDate:'2026-05-15'});
test.after(() => mf.dispose());

test('the split preserves every original 0010 byte across schema and explicit seed', () => {
  const marker = '-- Seed statements (unchanged from 0010):\n';
  const seed = read('scripts/seeds/kasandrinos-proof-pilot.sql').split(marker);
  assert.equal(seed.length, 2);
  const reconstructed = read('drizzle/0010_proof_exchange.sql') + seed[1];
  assert.equal(createHash('sha256').update(reconstructed).digest('hex'),
    '50ed381781449c4507d545ea1e70673932ae4de9bead824b5bacae8a1d3389af',
    'The split must not remove or alter any original DDL, constraint, index or seed statement');
  for (const file of ['0010_proof_exchange.sql', '0011_volatile_raza.sql', '0012_chief_cammi.sql']) {
    for (const statement of read('drizzle/' + file).split('--> statement-breakpoint')) {
      if (statement.trim()) assert.match(statement.trim(), /^(?:CREATE|ALTER)\b/i, file);
    }
  }
});

test('fresh migrations create all 11 tables without pilot rows; seed requires explicit local opt-in', async () => {
  const db = await mf.getD1Database('DB');
  for (const file of readdirSync(new URL('../drizzle', import.meta.url)).filter(f => f.endsWith('.sql')).sort()) {
    for (const statement of read('drizzle/' + file).split('--> statement-breakpoint')) {
      if (statement.trim()) await db.prepare(statement).run();
    }
  }
  for (const table of [...proofTables, 'team_accounts']) {
    assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first()).n, 0, table);
  }
  const schema = async () => (await db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE '_cf_%' ORDER BY type,name").all()).results;
  const before = await schema();
  await seedKasandrinosProofFixture(db);
  assert.deepEqual(await schema(), before, 'Explicit seeding must not alter schema');
  for (const [table, count] of Object.entries({team_accounts:1, proof_organizations:1,
    organization_roles:3, proof_lots:6, proof_certifications:5})) {
    assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first()).n, count, table);
  }
  for (const table of ['lot_tecrids', 'lot_releases', 'proof_delivery_receipts', 'sourcing_decisions', 'proof_stream_state', 'lot_tecrid_grants']) {
    assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table}`).first()).n, 0, table);
  }
  assert.deepEqual((await db.prepare('PRAGMA foreign_key_check').all()).results, []);
});

test('runtime and lifecycle sources never reference the held manual seed', () => {
  const references = [];
  for (const directory of ['app', 'server', 'worker', 'scripts']) {
    for (const path of readdirSync(new URL('../' + directory, import.meta.url), {recursive:true})) {
      if (!/\.(?:[cm]?js|tsx?|json|sh)$/.test(path)) continue;
      if (read(directory + '/' + path).includes('kasandrinos-proof-pilot')) references.push(directory + '/' + path);
    }
  }
  assert.deepEqual(references, []);
  assert(!read('package.json').includes('kasandrinos-proof-pilot'));
});
