const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('credentials auth allows normal members and dashboard redirects admins back to /admin', () => {
  const authSource = readSource('lib/auth.ts');
  const dashboardSource = readSource('app/(main)/dashboard/page.tsx');

  assert.doesNotMatch(authSource, /user\.role !== 'ADMIN'/);
  assert.match(authSource, /if \(!user\)/);
  assert.match(dashboardSource, /redirect\("\/admin"\)/);
});
