#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const settings = require('../data/saudi-tool-settings.json')['end-of-service-calculator'];
const { calculateEndOfService } = require('../assets/js/tools/end-of-service-calculator.js');

const base = { contractType: 'fixed', endType: 'ordinary', inScopeConfirmed: true };
const cases = [
  [{ ...base, monthlyFinalActualWageSAR: 10000, continuousServiceYears: 2 }, 10000],
  [{ ...base, monthlyFinalActualWageSAR: 12000, continuousServiceYears: 5 }, 30000],
  [{ ...base, monthlyFinalActualWageSAR: 12000, continuousServiceYears: 10 }, 90000],
  [{ ...base, monthlyFinalActualWageSAR: 8000, continuousServiceYears: 7.5 }, 40000],
  [{ ...base, monthlyFinalActualWageSAR: 12000, continuousServiceYears: 2.5 }, 15000],
  [{ ...base, monthlyFinalActualWageSAR: 10001.25, continuousServiceYears: 1.5 }, 7500.94],
  [{ ...base, monthlyFinalActualWageSAR: 9000, continuousServiceYears: 4 }, 18000],
  [{ ...base, monthlyFinalActualWageSAR: 10000, continuousServiceYears: 2, endType: 'resignation', resignationClassificationConfirmed: true }, 3333.33],
  [{ ...base, monthlyFinalActualWageSAR: 12000, continuousServiceYears: 5, endType: 'resignation', resignationClassificationConfirmed: true }, 10000],
  [{ ...base, monthlyFinalActualWageSAR: 12000, continuousServiceYears: 5.5, endType: 'resignation', resignationClassificationConfirmed: true }, 24000],
  [{ ...base, monthlyFinalActualWageSAR: 12000, continuousServiceYears: 10, endType: 'resignation', resignationClassificationConfirmed: true }, 90000],
  [{ ...base, monthlyFinalActualWageSAR: 10000, continuousServiceYears: 2, endType: 'resignation', resignationClassificationConfirmed: false }, null],
  [{ ...base, monthlyFinalActualWageSAR: 10000, continuousServiceYears: 1.5, endType: 'resignation', resignationClassificationConfirmed: true }, null],
  [{ ...base, monthlyFinalActualWageSAR: 10000, continuousServiceYears: 4, article87Exception: true }, null],
  [{ ...base, monthlyFinalActualWageSAR: -1, continuousServiceYears: 4 }, null]
];
for (const [input, expected] of cases) {
  const result = calculateEndOfService(input, settings);
  if (expected === null) assert.notEqual(result.status, 'calculated', JSON.stringify(input));
  else {
    assert.equal(result.status, 'calculated', JSON.stringify(input));
    assert.equal(result.amountSAR, expected, JSON.stringify(input));
  }
}
assert.equal(calculateEndOfService({ ...base, monthlyFinalActualWageSAR: 10000, continuousServiceYears: 4, inScopeConfirmed: false }, settings).status, 'blocked');
assert.equal(calculateEndOfService({ ...base, monthlyFinalActualWageSAR: 10000, continuousServiceYears: 4, endType: 'invalid' }, settings).status, 'invalid');
console.log(`End-of-service tests passed: ${cases.length} formula/boundary cases and 2 input/scope checks.`);
