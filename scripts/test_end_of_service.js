#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const settings = require('../data/saudi-tool-settings.json')['end-of-service-calculator'];
const { calculateEndOfService, resignationRatio, serviceYearsFromParts } = require('../assets/js/tools/end-of-service-calculator.js');

const base = { endType: 'resignation', inScopeConfirmed: true, monthlyFinalActualWageSAR: 12000 };
const boundaryCases = [
  [1.99, 0],
  [2.0, 4000],
  [5.0, 10000],
  [5.01, 20080],
  [9.99, 59920],
  [10.0, 90000]
];
for (const [years, expected] of boundaryCases) {
  const result = calculateEndOfService({ ...base, continuousServiceYears: years }, settings);
  assert.equal(result.status, 'calculated', `${years} years should calculate`);
  assert.equal(result.amountSAR, expected, `${years} years boundary amount`);
}
assert.equal(resignationRatio(1.99, settings), 0);
assert.equal(resignationRatio(2, settings), 1 / 3);
assert.equal(resignationRatio(5, settings), 1 / 3);
assert.equal(resignationRatio(5.01, settings), 2 / 3);
assert.equal(resignationRatio(9.99, settings), 2 / 3);
assert.equal(resignationRatio(10, settings), 1);

const partsCases = [
  [{ serviceYears: 2, serviceMonths: 0, serviceDays: 0 }, 2],
  [{ serviceYears: 5, serviceMonths: 1, serviceDays: 0 }, 5 + 1 / 12],
  [{ serviceYears: 1, serviceMonths: 11, serviceDays: 30 }, 2],
  [{ serviceYears: 0, serviceMonths: 0, serviceDays: 31 }, null],
  [{ serviceYears: 0, serviceMonths: 12, serviceDays: 0 }, null]
];
for (const [parts, expected] of partsCases) {
  assert.equal(serviceYearsFromParts(parts.serviceYears, parts.serviceMonths, parts.serviceDays, settings), expected);
}
const partResult = calculateEndOfService({ ...base, serviceYears: 5, serviceMonths: 1, serviceDays: 0 }, settings);
assert.equal(partResult.status, 'calculated');
assert.equal(partResult.amountSAR, 20666.67);

const ordinary = calculateEndOfService({ ...base, endType: 'ordinary', serviceYears: 10, serviceMonths: 0, serviceDays: 0 }, settings);
assert.equal(ordinary.status, 'calculated');
assert.equal(ordinary.amountSAR, 90000);
const noConfirmation = calculateEndOfService({ ...base, inScopeConfirmed: false, continuousServiceYears: 4 }, settings);
assert.equal(noConfirmation.status, 'blocked');
assert.equal(calculateEndOfService({ ...base, endType: 'invalid', continuousServiceYears: 4 }, settings).status, 'invalid');
assert.equal(calculateEndOfService({ ...base, monthlyFinalActualWageSAR: -1, continuousServiceYears: 4 }, settings).status, 'invalid');

const source = fs.readFileSync(require.resolve('../assets/js/tools/end-of-service-calculator.js'), 'utf8');
assert.equal((source.match(/type="checkbox"/g) || []).length, 1, 'Only one confirmation checkbox is allowed');
assert.doesNotMatch(source, /contractType/, 'Unused contract-type choice must be absent');
console.log('End-of-service tests passed: six Article 85 boundaries, compound duration, Article 84, one confirmation, and invalid inputs.');
