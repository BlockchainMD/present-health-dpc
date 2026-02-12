const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('/join plan cards keep CTA buttons bottom-aligned when card content differs', () => {
  const source = readSource('app/(main)/join/page.tsx');
  const cardPattern = /rounded-xl border border-border p-4 flex h-full flex-col/g;
  const cardMatches = source.match(cardPattern) || [];
  const bottomAnchorPattern = /className="mt-auto pt-3"/g;
  const bottomAnchorMatches = source.match(bottomAnchorPattern) || [];

  assert.equal(cardMatches.length, 2, 'expected both join plan cards to use flex-column full-height layout');
  assert.equal(bottomAnchorMatches.length, 2, 'expected both join plan cards to anchor CTA area at the bottom');
});

test('campaign LP pricing cards keep CTA footer aligned for generated tier content', () => {
  const source = readSource('app/(lp)/lp/[slug]/page.tsx');
  assert.match(source, /Card key=\{i\} className="h-full flex flex-col/);
  assert.match(source, /CardFooter className="mt-auto flex flex-col gap-4"/);
});

