const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("/dashboard keeps member-only gating without loading Healthbook data", () => {
  const dashboardSource = readSource("app/(main)/dashboard/page.tsx");

  assert.match(dashboardSource, /redirect\("\/login"\)/);
  assert.match(dashboardSource, /redirect\("\/admin"\)/);
  assert.match(dashboardSource, /MemberDashboardShell/);
  assert.doesNotMatch(dashboardSource, /getHealthbookFeedSnapshot/);
});

test("member dashboard shell stays focused on membership and care actions", () => {
  const shellSource = readSource("components/dashboard/MemberDashboardShell.tsx");

  assert.match(shellSource, /Email care team/);
  assert.match(shellSource, /What your membership covers/);
  assert.match(shellSource, /Your first 72 hours/);
  assert.doesNotMatch(shellSource, /Healthbook/);
});

test("admin Healthbook workflow drives SEO briefs from live signals", () => {
  const adminPageSource = readSource("app/admin/healthbook/page.tsx");
  const workspaceSource = readSource("components/admin/HealthbookSeoWorkspace.tsx");
  const layoutSource = readSource("app/admin/layout.tsx");
  const dataSource = readSource("lib/healthbook.ts");

  assert.match(adminPageSource, /getHealthbookFeedSnapshot/);
  assert.match(adminPageSource, /HealthbookSeoWorkspace/);
  assert.match(workspaceSource, /Generate content brief/);
  assert.match(workspaceSource, /\/api\/admin\/content-briefs/);
  assert.match(workspaceSource, /evergreen\s+content\s+briefs/i);
  assert.match(layoutSource, /href="\/admin\/healthbook"/);
  assert.match(dataSource, /HEALTHBOOK_CATEGORIES/);
  assert.match(dataSource, /HEALTHBOOK_SOURCE_TYPES/);
  assert.match(dataSource, /formatHealthbookRelativeTimestamp/);
  assert.match(dataSource, /Promise\.allSettled/);
  assert.match(dataSource, /peterattiamd\.com\/feed/);
  assert.match(dataSource, /loadPreprintFeedItems\("medrxiv"/);
  assert.doesNotMatch(dataSource, /const feedSeeds/);
});
