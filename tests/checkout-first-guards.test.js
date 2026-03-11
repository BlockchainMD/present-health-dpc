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
  assert.match(source, /fetch\("\/api\/membership\/checkout"/);
});

test('membership checkout supports guest setup and activation closes the loop', () => {
  const checkoutSource = readSource('app/api/membership/checkout/route.ts');
  const activateRouteSource = readSource('app/api/membership/activate/route.ts');
  const webhookSource = readSource('app/api/stripe/webhook/route.ts');
  const activatePageSource = readSource('app/(main)/activate/page.tsx');
  const tokenSource = readSource('lib/member-activation.ts');

  assert.match(checkoutSource, /checkoutMode: "guest"/);
  assert.match(checkoutSource, /success_url: absoluteUrl\("\/activate\?session_id=\{CHECKOUT_SESSION_ID\}"\)/);
  assert.match(activateRouteSource, /parseMemberActivationToken/);
  assert.match(webhookSource, /sendMemberActivationEmail/);
  assert.match(activatePageSource, /Set your password to open your Present Health dashboard/);
  assert.match(activatePageSource, /session_id/);
  assert.match(tokenSource, /buildMemberActivationUrl/);
});
