require("./helpers/register-ts");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HEALTHBOOK_CATEGORIES,
  HEALTHBOOK_SOURCE_TYPES,
  countHealthbookItemsWithinHours,
  curateHealthbookFeedItems,
  formatHealthbookRelativeTimestamp,
  sortHealthbookFeedItems,
} = require("../lib/healthbook");

function buildFixtureItem(overrides) {
  return {
    id: overrides.id,
    title: overrides.title || `Fixture ${overrides.id}`,
    source: overrides.source || "Fixture Source",
    sourceLabel: overrides.sourceLabel || "Fixture feed",
    sourceType: overrides.sourceType || "News",
    category: overrides.category || "Media",
    publishedAt: overrides.publishedAt,
    url: overrides.url || `https://example.com/${overrides.id}`,
    takeaway: overrides.takeaway || "Fixture takeaway",
    summary: overrides.summary || "Fixture summary",
    signal: overrides.signal || "High",
  };
}

test("healthbook curation keeps recent items sorted and trims duplicates", () => {
  const now = Date.UTC(2026, 2, 12, 0, 0, 0);
  const items = curateHealthbookFeedItems([
    buildFixtureItem({
      id: "lead",
      title: "Healthspan trial expands",
      sourceLabel: "Google News / healthspan",
      publishedAt: new Date(now - 8 * 60 * 1000).toISOString(),
      category: "Clinical",
      signal: "Lead",
    }),
    buildFixtureItem({
      id: "dup",
      title: "Healthspan trial expands",
      sourceLabel: "Google News / healthspan",
      publishedAt: new Date(now - 12 * 60 * 1000).toISOString(),
    }),
    buildFixtureItem({
      id: "protocol",
      title: "Wearable health trackers move from alerts to coaching",
      sourceLabel: "Google News / wearable health",
      publishedAt: new Date(now - 95 * 60 * 1000).toISOString(),
      category: "Tech & Biz",
    }),
    buildFixtureItem({
      id: "podcast",
      title: "Aging biomarkers and GLP-1s",
      sourceLabel: "Podcast feed",
      sourceType: "Podcasts",
      category: "Podcasts",
      publishedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
    }),
    buildFixtureItem({
      id: "old",
      title: "Old longevity note",
      sourceLabel: "Archive feed",
      publishedAt: new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(),
    }),
  ], now);

  assert.equal(HEALTHBOOK_CATEGORIES[0], "All");
  assert.equal(HEALTHBOOK_SOURCE_TYPES[0], "All Sources");
  assert.equal(items.length, 3);
  assert.equal(items[0].id, "lead");
  assert.ok(!items.some((item) => item.id === "dup"));
  assert.ok(!items.some((item) => item.id === "old"));
  assert.ok(new Date(items[0].publishedAt).getTime() >= new Date(items.at(-1).publishedAt).getTime());
});

test("healthbook helper functions respect generated timestamps", () => {
  const now = Date.UTC(2026, 2, 12, 0, 0, 0);
  const items = sortHealthbookFeedItems([
    buildFixtureItem({
      id: "a",
      publishedAt: new Date(now - 8 * 60 * 1000).toISOString(),
    }),
    buildFixtureItem({
      id: "b",
      publishedAt: new Date(now - 90 * 60 * 1000).toISOString(),
    }),
    buildFixtureItem({
      id: "c",
      publishedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    }),
  ]);
  const itemsWithinSixHours = countHealthbookItemsWithinHours(items, 6, now);

  assert.equal(formatHealthbookRelativeTimestamp(items[0].publishedAt, now), "8m");
  assert.equal(countHealthbookItemsWithinHours(items, 2, now), 2);
  assert.equal(itemsWithinSixHours, 3);
});
