#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const settings = require('../data/saudi-tool-settings.json')['zakat-calculator'];
const { calculateZakat } = require('../assets/js/tools/zakat-calculator.js');

const base = {
  nisabMode: 'gold', cashSAR: 25000, goldGrams: 0, goldKarat: 24, goldPrice24SAR: 250,
  silverGrams: 0, silverPriceSAR: 3, tradeGoodsSAR: 0, hawlCompleted: true
};
let result = calculateZakat(base, settings);
assert.equal(result.status, 'calculated');
assert.equal(result.thresholdSAR, 21250);
assert.equal(result.zakatDueSAR, 625);

result = calculateZakat({ ...base, cashSAR: 21249.99 }, settings);
assert.equal(result.meetsNisab, false);
assert.equal(result.zakatDueSAR, 0);
result = calculateZakat({ ...base, cashSAR: 25000, hawlCompleted: false }, settings);
assert.equal(result.meetsNisab, true);
assert.equal(result.zakatDueSAR, 0);

result = calculateZakat({ ...base, cashSAR: 2000, nisabMode: 'silver', silverPriceSAR: 3, goldPrice24SAR: 250 }, settings);
assert.equal(result.thresholdSAR, 1785);
assert.equal(result.zakatDueSAR, 50);

result = calculateZakat({ ...base, cashSAR: 0, tradeGoodsSAR: 10000, goldGrams: 10, goldKarat: 21, goldPrice24SAR: 300, silverGrams: 20, silverPriceSAR: 4 }, settings);
assert.equal(result.goldValueSAR, 2625);
assert.equal(result.silverValueSAR, 80);
assert.equal(result.totalWealthSAR, 12705);
assert.equal(result.zakatDueSAR, 0);

result = calculateZakat({ ...base, nisabMode: 'manual', manualNisabSAR: 20000, cashSAR: 25000 }, settings);
assert.equal(result.thresholdSAR, 20000);
assert.equal(result.zakatDueSAR, 625);
assert.equal(calculateZakat({ ...base, nisabMode: 'manual', manualNisabSAR: 0 }, settings).status, 'invalid');
assert.equal(calculateZakat({ ...base, cashSAR: -1 }, settings).status, 'invalid');
assert.equal(calculateZakat({ ...base, goldGrams: 1, goldPrice24SAR: 0 }, settings).status, 'invalid');

const moduleSource = fs.readFileSync(require.resolve('../assets/js/tools/zakat-calculator.js'), 'utf8');
assert.match(moduleSource, /85 غرامًا من الذهب الخالص \(الافتراضي\)/);
console.log('Zakat calculator tests passed: default 85g gold nisab, silver and custom thresholds, assets, hawl, and validation.');
