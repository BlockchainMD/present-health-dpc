require("./helpers/register-ts");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HEALTHBOOK_CATEGORIES,
  HEALTHBOOK_SOURCE_TYPES,
  countHealthbookItemsWithinHours,
  formatHealthbookRelativeTimestamp,
  getHealthbookFeedItems,
} = require("../lib/healthbook");

test("healthbook feed returns sorted items with expected filter metadata", () => {
  const now = Date.UTC(2026, 2, 12, 0, 0, 0);
  const items = getHealthbookFeedItems(now);

  assert.equal(HEALTHBOOK_CATEGORIES[0], "All");
  assert.equal(HEALTHBOOK_SOURCE_TYPES[0], "All Sources");
  assert.ok(items.length >= 10);
  assert.equal(items[0].id, "attia-x-apob-threshold");
  assert.ok(new Date(items[0].publishedAt).getTime() >= new Date(items.at(-1).publishedAt).getTime());
});

test("healthbook helper functions respect generated timestamps", () => {
  const now = Date.UTC(2026, 2, 12, 0, 0, 0);
  const items = getHealthbookFeedItems(now);
  const itemsWithinSixHours = countHealthbookItemsWithinHours(items, 6, now);

  assert.equal(formatHealthbookRelativeTimestamp(items[0].publishedAt, now), "8m");
  assert.equal(countHealthbookItemsWithinHours(items, 2, now), 10);
  assert.ok(itemsWithinSixHours >= 10);
  assert.ok(itemsWithinSixHours < items.length);
});
