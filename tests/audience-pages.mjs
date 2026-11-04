import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {informationPage} from '../public/information.js';

const pages = {
  '/for-buyers': ['From a private target', 'Define your need privately', 'Missing results stay unknown', 'time-limited soft hold', 'not a certification or a guarantee'],
  '/join': ['Your next connection', 'For brand buyers', 'For suppliers', 'For laboratories', 'See the laboratory path', 'never grants an account role'],
  '/access': ['Sign in with your email', 'No ChatGPT account needed', 'expires in 10 minutes', 'Email me a sign-in link', '/email-sign-in'],
  '/for-laboratories': ['Light Labs', 'Production issuer status pending verification', 'live TECRID authentication are not connected', 'https://www.lightlabs.com/', 'TECRID sandbox records'],
};
for (const [path, phrases] of Object.entries(pages)) {
  const html = informationPage(path);
  assert.equal(typeof html, 'string', path);
  assert.doesNotMatch(html, /[\u2013\u2014]|Clerk|free forever|QUALIFIED|listing fee/i, path);
  for (const phrase of phrases) assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), path + ' ' + phrase);
}
assert.equal(informationPage('/for-buyers-extra'), null);
assert.equal(informationPage('/missing'), null);

const source = readFileSync(new URL('../public/information.js', import.meta.url), 'utf8');
for (const path of Object.keys(pages)) assert.match(source, new RegExp(`href="${path}"`));

console.log('PASS audience pages reuse current public copy without new claims or dashes');
