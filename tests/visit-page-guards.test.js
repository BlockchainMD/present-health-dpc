const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('/visit uses the single-visit request form instead of sending primary CTA back to /join', () => {
  const source = readSource('app/(main)/visit/page.tsx');
  assert.match(source, /<SingleVisitRequestForm \/>/);
  assert.doesNotMatch(source, /Start Single Visit Request<\/Link>/);
});
