const fs = require('fs');
const source = fs.readFileSync('assets/js/tool-app.js', 'utf8');
const start = source.indexOf('const ones =');
const end = source.indexOf('function bindNumberWords');
if (start < 0 || end < 0) throw new Error('numberWords implementation not found');
const numberWords = new Function(`${source.slice(start, end)}; return numberWords;`)();
const cases = {
  0: 'صفر',
  10: 'عشرة',
  21: 'واحد وعشرون',
  100: 'مائة',
  101: 'مائة وواحد',
  999: 'تسعمائة وتسعة وتسعون',
  1000: 'ألف',
  100000: 'مائة ألف'
};
for (const [input, expected] of Object.entries(cases)) {
  const actual = numberWords(Number(input));
  if (actual !== expected) throw new Error(`${input}: expected ${expected}, got ${actual}`);
  console.log(`OK ${input}: ${actual}`);
}
console.log(`Checked ${Object.keys(cases).length} number-to-words cases`);
