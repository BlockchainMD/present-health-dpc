const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('/register is checkout-first and no longer asks for password before Stripe', () => {
  const source = readSource('app/(main)/register/page.tsx');

  assert.doesNotMatch(source, /signIn\(/);
  assert.doesNotMatch(source, /name="password"/);
  assert.match(source, /We&apos;ll send your account setup link after checkout/);
  assert.match(source, /fetch\("\/api\/stripe\/checkout"/);
});

test('Stripe checkout supports guest setup and webhook sends account setup email', () => {
  const checkoutSource = readSource('app/api/stripe/checkout/route.ts');
  const webhookSource = readSource('app/api/stripe/webhook/route.ts');
  const setupRouteSource = readSource('app/api/account/setup/route.ts');
  const setupPageSource = readSource('app/(main)/setup-account/page.tsx');

  assert.match(checkoutSource, /requiresPasswordSetup: guestCheckout \? "true" : "false"/);
  assert.match(checkoutSource, /successUrl = guestCheckout/);
  assert.match(checkoutSource, /First name, last name, and email are required before checkout/);
  assert.match(webhookSource, /sendMemberSetupEmail/);
  assert.match(setupRouteSource, /parseMemberSetupToken/);
  assert.match(setupPageSource, /Set your password to open your Present Health dashboard/);
});
