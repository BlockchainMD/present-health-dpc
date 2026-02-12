const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('pricing membership copy uses scoped-inclusion language and stronger disclaimers', () => {
  const source = readSource('components/pricing/MembershipTiers.tsx');

  assert.match(source, /One plan\. All primary care services included\./);
  assert.doesNotMatch(source, /Present Health covers primary care and does not replace health insurance/);
  assert.match(source, /Typical response time: within 4 business hours/);
  assert.match(source, /HSA-eligible starting 2026\./);
  assert.doesNotMatch(source, /One plan\. Everything included\./);
  assert.doesNotMatch(source, /transparent wholesale pricing/);
});

test('pricing calculator is framed as primary-care comparison, not insurance-equivalence', () => {
  const source = readSource('components/pricing/CostComparisonCalculator.tsx');

  assert.match(source, /Primary care cost comparison calculator/);
  assert.match(source, /not insurance and does not replace health insurance coverage/);
  assert.match(source, /primary-care cost differences only/);
  assert.match(source, /Estimated annual urgent care spend without membership/);
  assert.doesNotMatch(source, /Annual cost with traditional insurance/);
  assert.doesNotMatch(source, /Estimated annual savings/);
});
