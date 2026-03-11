const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('annual membership CTA is exposed on /join and carried through /register + Stripe checkout', () => {
  const joinSource = readSource('app/(main)/join/page.tsx');
  const registerSource = readSource('app/(main)/register/page.tsx');
  const checkoutSource = readSource('app/api/stripe/checkout/route.ts');

  assert.match(joinSource, /\/register\?plan=individual&billing=annual/);
  assert.match(registerSource, /normalizeBillingCadence/);
  assert.match(registerSource, /billing: billingCadence/);
  assert.match(checkoutSource, /interval: billing === "annual" \? 'year' : 'month'/);
});
