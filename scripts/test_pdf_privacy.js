#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const worker = read('assets/js/tools/pdf-tools-worker.js');
const moduleSource = read('assets/js/tools/pdf-tools.js');
const license = read('assets/vendor/pdf-lib-LICENSE.md');
const bundlePath = path.join(root, 'assets/vendor/pdf-lib.min.js');
const bundleStat = fs.statSync(bundlePath);

assert.ok(bundleStat.size > 100_000, 'The bundled pdf-lib file should be present locally');
assert.match(license, /MIT License/);
assert.match(license, /Copyright \(c\) 2019 Andrew Dillon/);
assert.match(worker, /importScripts\('\/assets\/vendor\/pdf-lib\.min\.js'\)/, 'Worker must load the local bundle');
assert.doesNotMatch(worker, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|https?:\/\//i, 'Worker must not make external or upload requests');
assert.doesNotMatch(moduleSource, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|https?:\/\//i, 'PDF UI must not send file data over the network');
assert.match(moduleSource, /new Worker\('\/assets\/js\/tools\/pdf-tools-worker\.js'\)/);
assert.doesNotMatch(moduleSource, /<form[^>]+\baction\s*=/i, 'PDF form must not submit to a server endpoint');

const data = JSON.parse(read('data/tools.json'));
const slugs = ['pdf-merge', 'pdf-split', 'images-to-pdf', 'pdf-organizer'];
for (const slug of slugs) {
  const tool = data.tools.find(item => item.slug === slug);
  assert.ok(tool, `Missing registry entry ${slug}`);
  assert.match(tool.intro, /Web Worker/);
  const page = read(`tools/${slug}.html`);
  assert.match(page, /\/assets\/js\/tools\/pdf-tools\.js\?v=\d{8}-\d+/);
  assert.doesNotMatch(page, /unpkg\.com|jsdelivr\.net|cdnjs\.com/i);
}

const sw = read('sw.js');
for (const file of [
  '/assets/js/tools/pdf-tools.js',
  '/assets/js/tools/pdf-tools-worker.js',
  '/assets/vendor/pdf-lib.min.js',
  '/assets/vendor/pdf-lib-LICENSE.md'
]) assert.ok(sw.includes(file), `Service Worker must cache ${file}`);

console.log('PDF privacy checks passed: local MIT bundle, local Worker, no CDN/upload APIs, and offline assets registered.');
