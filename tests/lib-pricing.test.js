const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/register-ts');

const pricing = require('../lib/pricing.ts');

test('pricing constants reflect the advertised two-tier model ($99 individual / $179 household)', () => {
  assert.equal(pricing.MEMBERSHIP_MONTHLY_DOLLARS, 99);
  assert.equal(pricing.MEMBERSHIP_ANNUAL_DOLLARS, 990);
  assert.equal(pricing.MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS, 198);
  assert.equal(pricing.HOUSEHOLD_MONTHLY_DOLLARS, 179);
  assert.equal(pricing.HOUSEHOLD_ANNUAL_DOLLARS, 1790);
  assert.equal(pricing.HOUSEHOLD_ANNUAL_SAVINGS_DOLLARS, 358);
  assert.equal(pricing.SINGLE_VISIT_DOLLARS, 99);
  // Internal CRM baseline only — must equal the individual rate until a
  // dedicated employer tier is decided (the old $29 was forbidden-model drift).
  assert.equal(pricing.EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS, 99);
});

test('household tiers charge the advertised $179 (couple and family both map to Household)', () => {
  assert.equal(pricing.MEMBERSHIP_TIERS.individual.monthlyDollars, 99);
  assert.equal(pricing.MEMBERSHIP_TIERS.individual.annualDollars, 990);
  assert.equal(pricing.MEMBERSHIP_TIERS.couple.monthlyDollars, 179);
  assert.equal(pricing.MEMBERSHIP_TIERS.family.monthlyDollars, 179);
  assert.equal(pricing.MEMBERSHIP_TIERS.couple.annualDollars, 1790);
  assert.equal(pricing.MEMBERSHIP_TIERS.family.annualDollars, 1790);
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
