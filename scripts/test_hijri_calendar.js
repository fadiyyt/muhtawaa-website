#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const hijri = require('../assets/js/tools/hijri-tools.js');
const root = path.resolve(__dirname, '..');
const payload = JSON.parse(fs.readFileSync(path.join(root, 'data/ummalqura-1356-1500.json'), 'utf8'));
const official = JSON.parse(fs.readFileSync(path.join(root, 'data/ummalqura-official-samples.json'), 'utf8'));
const data = hijri.buildIndex(payload);

assert.equal(payload.gregorianStart, '1937-03-14');
assert.equal(payload.gregorianEnd, '2077-11-16');
assert.equal(payload.hijriDateByGregorianDay.length, payload.dayCount);
assert.equal(payload.hijriDateByGregorianDay[0], 13560101);
assert.equal(payload.hijriDateByGregorianDay.at(-1), 15001230);
assert.equal(hijri.indexForGregorian('1937-03-13', data), null);
assert.equal(hijri.indexForGregorian('2077-11-17', data), null);

const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric'
});
const start = new Date(Date.UTC(1937, 2, 14));
for (let i = 0; i < payload.dayCount; i += 1) {
  const date = new Date(start.getTime() + i * 86400000 + 12 * 60 * 60 * 1000);
  const parts = Object.fromEntries(formatter.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
  const expected = parts.year * 10000 + parts.month * 100 + parts.day;
  assert.equal(payload.hijriDateByGregorianDay[i], expected, `Intl table mismatch at index ${i}`);
}

assert.equal(official.samples.length, 30);
for (const sample of official.samples) {
  assert.equal(sample.match, true, `${sample.gregorian} must match official Umm al-Qura converter`);
  assert.equal(sample.official, sample.intl);
  const gIndex = hijri.indexForGregorian(sample.gregorian, data);
  const h = hijri.hijriAt(gIndex, data);
  const hText = `${String(h.year).padStart(4, '0')}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
  assert.equal(hText, sample.official);
  const reverseIndex = hijri.hDateIndex(h.year, h.month, h.day, data);
  assert.equal(reverseIndex, gIndex, `reverse conversion mismatch for ${sample.official}`);
}
assert.equal(hijri.hDateIndex(1356, 1, 30, data), null, 'Reject day 30 in a 29-day month');
assert.equal(hijri.hDateIndex(1501, 1, 1, data), null, 'Reject years beyond the supported range');
assert.equal(hijri.hDateIndex(1355, 12, 30, data), null, 'Reject years before the supported range');
assert.equal(hijri.hDateIndex(1500, 12, 30, data), payload.dayCount - 1);

const age = hijri.calculateHijriAge({ year: 1446, month: 1, day: 1 }, { year: 1448, month: 1, day: 1 }, data);
assert.deepEqual(age, { years: 2, months: 0, days: 0 });
assert.equal(hijri.calculateHijriAge({ year: 1448, month: 1, day: 1 }, { year: 1446, month: 1, day: 1 }, data), null);
console.log(`Hijri calendar tests passed: ${payload.dayCount} Intl dates, ${official.samples.length} official matches, reverse conversion, range rejection, and age calculation.`);
