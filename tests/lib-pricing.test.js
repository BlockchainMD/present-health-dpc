const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/register-ts');

const pricing = require('../lib/pricing.ts');

test('pricing constants reflect current single-plan business model', () => {
  assert.equal(pricing.MEMBERSHIP_MONTHLY_DOLLARS, 99);
  assert.equal(pricing.MEMBERSHIP_ANNUAL_DOLLARS, 990);
  assert.equal(pricing.MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS, 98);
  assert.equal(pricing.SINGLE_VISIT_DOLLARS, 99);
  assert.equal(pricing.EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS, 29);
});

test('membership tiers all map to same monthly price in single-plan model', () => {
  assert.equal(pricing.MEMBERSHIP_TIERS.individual.monthlyDollars, 99);
  assert.equal(pricing.MEMBERSHIP_TIERS.couple.monthlyDollars, 99);
  assert.equal(pricing.MEMBERSHIP_TIERS.family.monthlyDollars, 99);
});

test('normalizeCoverageType keeps supported values', () => {
  assert.equal(pricing.normalizeCoverageType('individual'), 'individual');
  assert.equal(pricing.normalizeCoverageType('couple'), 'couple');
  assert.equal(pricing.normalizeCoverageType('family'), 'family');
});

test('normalizeCoverageType defaults to individual for unsupported values', () => {
  assert.equal(pricing.normalizeCoverageType(''), 'individual');
  assert.equal(pricing.normalizeCoverageType('INDIVIDUAL'), 'individual');
  assert.equal(pricing.normalizeCoverageType('other'), 'individual');
  assert.equal(pricing.normalizeCoverageType(undefined), 'individual');
  assert.equal(pricing.normalizeCoverageType(null), 'individual');
});

test('default insurance premium map and marginal tax rates are complete', () => {
  assert.deepEqual(Object.keys(pricing.DEFAULT_INSURANCE_PREMIUMS_DOLLARS).sort(), ['couple', 'family', 'individual']);
  assert.equal(pricing.DEFAULT_MARGINAL_TAX_RATE.single, 0.22);
  assert.equal(pricing.DEFAULT_MARGINAL_TAX_RATE.married_filing_jointly, 0.22);
});
