import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {retiredPublicRedirects, retiredPublicRedirectTarget} from '../server/retired-public-redirects.mjs';

const routeSource = readFileSync(new URL('../app/[[...path]]/route.ts', import.meta.url), 'utf8');
const knownLine = routeSource.split('\n').find((line) => line.includes('const known='));
assert.ok(knownLine, 'known-route regex is present');
const knownLiteral = knownLine.slice(knownLine.indexOf('const known=') + 'const known='.length, knownLine.lastIndexOf('.test(path)'));
const known = eval(knownLiteral);
const restored = ['/for-buyers', '/join', '/access', '/for-laboratories'];

assert.deepEqual(retiredPublicRedirects, []);
for (const path of restored) {
  assert.equal(known.test(path), true, path);
  assert.equal(known.test(path + '/'), true, path + '/');
  assert.equal(retiredPublicRedirectTarget(path), null, path);
  assert.equal(retiredPublicRedirectTarget(path + '/'), null, path + '/');
}
for (const path of ['/for-buyers-extra', '/access/private', '/join/private', '/for-laboratories/extra']) {
  assert.equal(known.test(path), false, path);
  assert.equal(retiredPublicRedirectTarget(path), null, path);
}

const configSource = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
assert.match(configSource, /retired-public-redirects\.mjs/);
assert.match(configSource, /statusCode:\s*301/);

const {runnerImport} = await import('vite');
const loaded = await runnerImport(new URL('../next.config.ts', import.meta.url).pathname, {root: new URL('..', import.meta.url).pathname, logLevel: 'error'});
const rules = await loaded.module.default.redirects();
assert.deepEqual(rules, []);

console.log('PASS indexed audience routes are pages, not redirects');
