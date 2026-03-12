const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("/dashboard keeps member-only gating and loads Healthbook feed data", () => {
  const dashboardSource = readSource("app/(main)/dashboard/page.tsx");

  assert.match(dashboardSource, /redirect\("\/login"\)/);
  assert.match(dashboardSource, /redirect\("\/admin"\)/);
  assert.match(dashboardSource, /getHealthbookFeedSnapshot/);
  assert.match(dashboardSource, /MemberDashboardShell/);
});

test("member dashboard shell exposes care overview and Healthbook tabs", () => {
  const shellSource = readSource("components/dashboard/MemberDashboardShell.tsx");

  assert.match(shellSource, /TabsTrigger value="overview"/);
  assert.match(shellSource, /TabsTrigger value="healthbook"/);
  assert.match(shellSource, /Email care team/);
  assert.match(shellSource, /What your membership covers/);
});

test("Healthbook feed preserves filterable signal stream behavior", () => {
  const feedSource = readSource("components/dashboard/HealthbookFeed.tsx");
  const dataSource = readSource("lib/healthbook.ts");

  assert.match(feedSource, /activeCategory/);
  assert.match(feedSource, /activeSourceType/);
  assert.match(feedSource, /Latest signal stream/);
  assert.match(feedSource, /countHealthbookItemsWithinHours/);
  assert.match(dataSource, /HEALTHBOOK_CATEGORIES/);
  assert.match(dataSource, /HEALTHBOOK_SOURCE_TYPES/);
  assert.match(dataSource, /formatHealthbookRelativeTimestamp/);
  assert.match(dataSource, /Promise\.allSettled/);
  assert.match(dataSource, /peterattiamd\.com\/feed/);
  assert.match(dataSource, /loadPreprintFeedItems\("medrxiv"/);
  assert.doesNotMatch(dataSource, /const feedSeeds/);
});
