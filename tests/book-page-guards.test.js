const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { FORBIDDEN } = require("./business-model-truth-patterns");

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("/book is a membership-first chooser with membership and single-visit paths", () => {
  const source = readSource("app/(main)/book/page.tsx");

  assert.match(source, /How do you want to start\?/);
  assert.match(source, /Primary path/);
  assert.match(source, /Membership/);
  assert.match(source, /Single visit/);
  assert.match(source, /buildHrefWithSearchParams\("\/join", params\)/);
  assert.match(source, /href="\/visit"/);
});

test("/book has no insurance-gate form or forbidden business-model copy", () => {
  const source = readSource("app/(main)/book/page.tsx");

  assert.doesNotMatch(source, /useState/);
  assert.doesNotMatch(source, /hasInsurance|setStep\("insurance"\)|Do you have insurance|Insurance Plan Name|Member ID/);

  for (const pattern of FORBIDDEN) {
    assert.doesNotMatch(
      source,
      pattern,
      `app/(main)/book/page.tsx contains forbidden business-model claim matching ${pattern}`
    );
  }
});

test("/book instruments both chooser cards", () => {
  const analyticsSource = readSource("lib/analytics.ts");
  const linkSource = readSource("components/book/BookChoiceLink.tsx");

  assert.match(analyticsSource, /VISIT_PATH_CLICK: 'VISIT_PATH_CLICK'/);
  assert.match(analyticsSource, /VISIT_PATH_CLICK: 'select_content'/);
  assert.match(linkSource, /AnalyticsEvents\.JOIN_CLICK/);
  assert.match(linkSource, /AnalyticsEvents\.VISIT_PATH_CLICK/);
  assert.match(linkSource, /data-book-choice-link="true"/);
});
