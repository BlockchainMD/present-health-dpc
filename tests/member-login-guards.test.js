const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('NextAuth credentials provider does not restrict member login to admins', () => {
  const source = readSource('lib/auth.ts');
  assert.doesNotMatch(source, /role !== 'ADMIN'/);
  assert.match(source, /if \(!user\)/);
});
