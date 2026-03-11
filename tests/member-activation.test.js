require('./helpers/register-ts');

const test = require('node:test');
const assert = require('node:assert/strict');

test('member activation tokens round-trip with email and session id', async () => {
  process.env.NEXTAUTH_SECRET = 'test-member-activation-secret';
  const mod = await import('../lib/member-activation.ts');

  const token = mod.createMemberActivationToken({
    email: 'Member@example.com',
    sessionId: 'cs_test_123',
  });

  const parsed = mod.parseMemberActivationToken(token);
  assert.deepEqual(parsed && { email: parsed.email, sessionId: parsed.sessionId }, {
    email: 'member@example.com',
    sessionId: 'cs_test_123',
  });
});

test('member activation tokens reject tampering and expiration', async () => {
  process.env.NEXTAUTH_SECRET = 'test-member-activation-secret';
  const mod = await import('../lib/member-activation.ts');

  const tampered = `${mod.createMemberActivationToken({
    email: 'member@example.com',
    sessionId: 'cs_test_123',
  })}x`;

  assert.equal(mod.parseMemberActivationToken(tampered), null);

  const expired = mod.createMemberActivationToken({
    email: 'member@example.com',
    sessionId: 'cs_test_123',
    expiresInMs: -1000,
  });

  assert.equal(mod.parseMemberActivationToken(expired), null);
});
