#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const START = '1937-03-14';
const END = '2077-11-16';
const START_HIJRI = '1356-01-01';
const END_HIJRI = '1500-12-30';
const DAY_MS = 86400000;
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'data', 'ummalqura-1356-1500.json');
const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
  timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric'
});

function utcDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function ymdFromParts(date) {
  const parts = Object.fromEntries(fmt.formatToParts(date)
    .filter(p => p.type !== 'literal')
    .map(p => [p.type, p.value]));
  return Number(parts.year) * 10000 + Number(parts.month) * 100 + Number(parts.day);
}
function hijriString(value) {
  const y = Math.floor(value / 10000);
  const m = Math.floor(value / 100) % 100;
  const d = value % 100;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const start = utcDate(START);
const end = utcDate(END);
const days = [];
for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) {
  days.push(ymdFromParts(new Date(t + 12 * 60 * 60 * 1000)));
}
if (hijriString(days[0]) !== START_HIJRI || hijriString(days.at(-1)) !== END_HIJRI) {
  throw new Error(`Unexpected Intl boundaries: ${hijriString(days[0])} .. ${hijriString(days.at(-1))}`);
}
for (let i = 1; i < days.length; i += 1) {
  const prev = days[i - 1];
  const curr = days[i];
  const py = Math.floor(prev / 10000), pm = Math.floor(prev / 100) % 100, pd = prev % 100;
  const cy = Math.floor(curr / 10000), cm = Math.floor(curr / 100) % 100, cd = curr % 100;
  const sameMonthNextDay = cy === py && cm === pm && cd === pd + 1;
  const nextMonth = pm < 12 ? [py, pm + 1] : [py + 1, 1];
  const validMonthBoundary = pd >= 29 && cd === 1 && cy === nextMonth[0] && cm === nextMonth[1];
  if (!sameMonthNextDay && !validMonthBoundary) {
    throw new Error(`Non-contiguous Hijri sequence at index ${i}: ${prev} -> ${curr}`);
  }
}
const payload = {
  calendar: 'islamic-umalqura',
  generatedBy: 'Intl.DateTimeFormat(en-u-ca-islamic-umalqura-nu-latn), UTC',
  gregorianStart: START,
  gregorianEnd: END,
  hijriStart: START_HIJRI,
  hijriEnd: END_HIJRI,
  dayCount: days.length,
  hijriDateByGregorianDay: days
};
fs.writeFileSync(OUTPUT, JSON.stringify(payload) + '\n', 'utf8');
console.log(`Generated ${days.length} Gregorian day mappings: ${START}..${END} (${START_HIJRI}..${END_HIJRI})`);
