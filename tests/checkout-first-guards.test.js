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
  assert.match(source, /After checkout, you&apos;ll set your password on the next screen/);
  assert.match(source, /fetch\("\/api\/stripe\/checkout"/);
});

test('stripe checkout supports guest setup and activation closes the loop', () => {
  const checkoutSource = readSource('app/api/stripe/checkout/route.ts');
  const webhookSource = readSource('app/api/stripe/webhook/route.ts');
  const activatePageSource = readSource('app/(main)/activate/page.tsx');
  const tokenSource = readSource('lib/member-activation.ts');

  assert.match(checkoutSource, /checkoutMode: "guest"/);
  assert.match(checkoutSource, /success_url: absoluteUrl\("\/activate\?session_id=\{CHECKOUT_SESSION_ID\}"\)/);
  assert.match(checkoutSource, /First name, last name, and email are required before checkout/);
  assert.match(webhookSource, /sendMemberActivationEmail/);
  assert.match(activatePageSource, /Set your password to open your Present Health dashboard/);
  assert.match(activatePageSource, /session_id/);
  assert.match(tokenSource, /buildMemberActivationUrl/);
});
