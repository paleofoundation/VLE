import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {retiredPublicRedirects, retiredPublicRedirectTarget} from '../server/retired-public-redirects.mjs';

const routeSource = readFileSync(new URL('../app/[[...path]]/route.ts', import.meta.url), 'utf8');
const knownLine = routeSource.split('\n').find((line) => line.includes('const known='));
assert.ok(knownLine, 'known-route regex is present');
const knownLiteral = knownLine.slice(knownLine.indexOf('const known=') + 'const known='.length, knownLine.lastIndexOf('.test(path)'));
const known = eval(knownLiteral);
const sources = retiredPublicRedirects.map((rule) => rule.source);
const destinations = [...new Set(retiredPublicRedirects.map((rule) => rule.destination))];

assert.deepEqual(sources, ['/for-laboratories', '/access', '/join', '/for-buyers']);
assert.deepEqual(destinations, ['/resources/labs/light-labs', '/email-sign-in', '/brand']);
assert.equal(new Set(sources).size, sources.length);

for (const {source, destination} of retiredPublicRedirects) {
  assert.equal(known.test(source), false, source);
  assert.equal(known.test(destination), true, destination);
  assert.equal(destination.endsWith('/'), false);
  assert.equal(sources.includes(destination), false);
  assert.equal(retiredPublicRedirectTarget(source), destination);
  assert.equal(retiredPublicRedirectTarget(source + '/'), destination);
  assert.equal(retiredPublicRedirectTarget(destination), null, destination);
  assert.equal(retiredPublicRedirectTarget(destination + '/'), null, destination + '/');
}

for (const path of ['/', '/for-buyers-extra', '/access/private', '/join/private', '/for-laboratories/extra', '/resources', '/how-it-works', '/email-sign-in', '/brand', '/resources/labs/light-labs']) {
  assert.equal(sources.includes(path), false, path);
}

const configSource = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
assert.match(configSource, /retired-public-redirects\.mjs/);
assert.match(configSource, /statusCode:\s*301/);

const {runnerImport} = await import('vite');
const loaded = await runnerImport(new URL('../next.config.ts', import.meta.url).pathname, {root: new URL('..', import.meta.url).pathname, logLevel: 'error'});
const rules = await loaded.module.default.redirects();
assert.equal(rules.length, retiredPublicRedirects.length * 2);
for (const {source, destination} of retiredPublicRedirects) {
  for (const path of [source, source + '/']) {
    const rule = rules.find((item) => item.source === path);
    assert.ok(rule, path);
    assert.equal(rule.destination, destination);
    assert.equal(rule.statusCode, 301);
    assert.equal(rule.permanent, true);
    assert.equal(rules.filter((item) => item.source === path).length, 1);
  }
}

console.log('PASS retired public redirects: one hop, live destinations, next.config 301');
