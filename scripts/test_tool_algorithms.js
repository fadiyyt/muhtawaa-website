const fs = require('fs');
const source = fs.readFileSync('assets/js/tool-app.js', 'utf8');

const numberStart = source.indexOf('const ones =');
const numberEnd = source.indexOf('function bindNumberWords');
if (numberStart < 0 || numberEnd < 0) throw new Error('numberWords implementation not found');
const numberWords = new Function(`${source.slice(numberStart, numberEnd)}; return numberWords;`)();
const numberCases = {
  0: 'صفر',
  10: 'عشرة',
  21: 'واحد وعشرون',
  100: 'مائة',
  101: 'مائة وواحد',
  999: 'تسعمائة وتسعة وتسعون',
  1000: 'ألف',
  2000: 'ألفان',
  3000: 'ثلاثة آلاف',
  21000: 'واحد وعشرون ألف',
  100000: 'مائة ألف',
  1000000: 'مليون',
  2000000: 'مليونان',
  2001000: 'مليونان وألف'
};
for (const [input, expected] of Object.entries(numberCases)) {
  const actual = numberWords(Number(input));
  if (actual !== expected) throw new Error(`${input}: expected ${expected}, got ${actual}`);
  console.log(`OK number ${input}: ${actual}`);
}

const ageStart = source.indexOf('function utcDate(');
const ageEnd = source.indexOf('function bindAge()', ageStart);
if (ageStart < 0 || ageEnd < 0) throw new Error('calculateAgeParts implementation not found');
const calculateAgeParts = new Function(`${source.slice(ageStart, ageEnd)}; return calculateAgeParts;`)();
const ageCases = [
  ['1990-03-15', '2026-03-15', { years: 36, months: 0, days: 0 }],
  ['1990-03-20', '2026-03-15', { years: 35, months: 11, days: 23 }],
  ['2000-02-29', '2025-02-28', { years: 25, months: 0, days: 0 }],
  ['2001-01-31', '2001-02-28', { years: 0, months: 1, days: 0 }],
  ['2000-01-31', '2000-03-01', { years: 0, months: 1, days: 1 }]
];
for (const [birth, end, expected] of ageCases) {
  const actual = calculateAgeParts(birth, end);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${birth} to ${end}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  console.log(`OK age ${birth} to ${end}: ${actual.years}y ${actual.months}m ${actual.days}d`);
}
for (const [birth, end] of [['2000-02-30', '2025-01-01'], ['2025-01-02', '2025-01-01']]) {
  if (calculateAgeParts(birth, end) !== null) throw new Error(`Expected invalid range for ${birth} to ${end}`);
  console.log(`OK invalid age range ${birth} to ${end}`);
}

const localDateStart = source.indexOf('function formatLocalDate(');
const localDateEnd = source.indexOf('const numberValue', localDateStart);
if (localDateStart < 0 || localDateEnd < 0) throw new Error('formatLocalDate implementation not found');
const formatLocalDate = new Function(`${source.slice(localDateStart, localDateEnd)}; return formatLocalDate;`)();
const formatted = formatLocalDate(new Date(2026, 0, 5, 0, 30));
if (formatted !== '2026-01-05') throw new Error(`Local date formatting expected 2026-01-05, got ${formatted}`);
console.log(`OK local date formatting: ${formatted}`);
console.log(`Checked ${Object.keys(numberCases).length} number-to-words cases and ${ageCases.length + 2} age cases`);
