import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initial, allLots } from '../server/fixtures.js';
import { kasCatalog } from '../server/kasandrinos.js';

// Execute the real browser entrypoint against an anonymous bootstrap response.
// This captures its actual render output without changing application exports.
const root = { innerHTML: '' };
const saved = new Map();
const replace = (key, value) => {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
};
replace('document', {
  body: { classList: { toggle() {} } },
  querySelector: selector => selector === '#app' ? root : { addEventListener() {} },
  addEventListener() {},
});
replace('window', { addEventListener() {} });
replace('location', { pathname: '/', search: '' });
replace('localStorage', { removeItem() {} });
replace('setInterval', () => 0);
replace('fetch', async path => {
  assert.equal(path, '/api/bootstrap', 'Anonymous homepage should only need its bootstrap');
  return {
    ok: true,
    json: async () => ({
      state: initial(), version: 0, lots: allLots(), kasandrinos: kasCatalog(),
      session: { signedIn: false, email: null },
    }),
  };
});
try {
  await import('../public/app.js');
} finally {
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}

const sections = [...root.innerHTML.matchAll(/<section\b[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g)];
const [hero, next] = sections;
assert(hero?.[1].split(' ').includes('home-search-hero'), 'First section must be ingredient lookup');
assert.match(hero[2], /<h1>/);
assert.match(hero[2], /<p>Find your ingredient\./);
assert.match(hero[2], /aria-label="Search ingredients or suppliers"/);
assert.match(hero[2], /<button[^>]*type="submit">Find lots /);
assert.doesNotMatch(hero[2], /Meet Kasandrinos|Find your next supplier|Meet your next buyer|hero-supplier/);
assert.equal(next?.[1], 'home-next', 'Supplier and role cards must follow the hero');
for (const title of ['Meet Kasandrinos.', 'Find your next supplier.', 'Meet your next buyer.']) {
  assert(next[2].includes(title), `${title} must remain available below the hero`);
}
console.log('PASS: actual anonymous homepage renders lookup first and all three cards in the following section.');

const details = root.innerHTML.match(/<details\b([^>]*)><summary>Evidence and sourcing boundaries<\/summary>([\s\S]*?)<\/details>/);
assert(details, 'Sourcing boundaries must render');
assert.match(details[1], /\bopen\b/, 'Homepage sourcing boundaries must start expanded');
const paragraphs = [...details[2].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(match => match[1].trim());
assert.equal(paragraphs.length, 3);
assert(paragraphs.every(text => text.length > 50), 'Visible boundary paragraphs must not be empty');
console.log('PASS: actual anonymous homepage renders expanded sourcing boundaries with all three paragraphs.');

function checkBrowser(snapshot) {
  assert.equal(snapshot.viewport.width, 1280, 'Capture at the ordered 1280px width');
  const visible = element => {
    assert(element && element.width > 0 && element.height > 0, 'Element must have visible dimensions');
    assert.notEqual(element.display, 'none');
    assert(!['hidden', 'collapse'].includes(element.visibility));
    assert(Number(element.opacity) > 0);
  };
  for (const key of ['headline', 'subline', 'search', 'findLots']) {
    visible(snapshot[key]);
    assert(snapshot[key].top >= 0 && snapshot[key].bottom <= snapshot.viewport.height, `${key} must fit above the fold`);
    assert(snapshot[key].left >= 0 && snapshot[key].right <= snapshot.viewport.width, `${key} must fit horizontally`);
  }
  assert.equal(snapshot.heroCards, 0);
  assert.equal(snapshot.roles.length, 2);
  for (const card of [snapshot.kasandrinos, ...snapshot.roles]) {
    visible(card);
    assert(card.top >= snapshot.viewport.height, 'Supplier and role cards must be below the fold');
    assert(card.top >= snapshot.hero.bottom, 'Cards must follow the hero');
  }
  assert.equal(snapshot.boundaries.open, true);
  visible(snapshot.boundaries.content);
  assert.equal(snapshot.boundaries.paragraphs.length, paragraphs.length);
  assert.deepEqual(snapshot.boundaries.paragraphs, paragraphs);
  assert(snapshot.boundaries.content.top >= snapshot.boundaries.summary.bottom);
}

const snapshotPath = process.argv[2];
if (snapshotPath) {
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  checkBrowser(snapshot);
  console.log(`PASS: ${snapshot.url} at 1280x${snapshot.viewport.height}: lookup fits above fold, cards are below fold, sourcing text is visible.`);
  for (const regress of [
    value => { value.kasandrinos.top = 0; },
    value => { value.boundaries.open = false; },
    value => { value.boundaries.content.height = 0; },
    value => { value.boundaries.paragraphs = []; },
  ]) {
    const broken = structuredClone(snapshot);
    regress(broken);
    assert.throws(() => checkBrowser(broken), 'Browser check must reject the reported regression');
  }
  console.log('PASS: checks reject card crowding, collapsed, hidden and empty boundary regressions.');
}
