const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("app layout does not depend on next/font/google during build", () => {
  const layoutSource = readSource("app/layout.tsx");
  const globalsSource = readSource("app/globals.css");

  assert.doesNotMatch(layoutSource, /next\/font\/google/);
  assert.doesNotMatch(layoutSource, /Geist/);
  assert.match(globalsSource, /--font-geist-sans:/);
  assert.match(globalsSource, /--font-geist-mono:/);
});
