require("./helpers/register-ts");

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HEALTHBOOK_CATEGORIES,
  HEALTHBOOK_SOURCE_TYPES,
  buildHealthbookXSearchConfigs,
  countHealthbookItemsWithinHours,
  curateHealthbookFeedItems,
  formatHealthbookRelativeTimestamp,
  mapHealthbookXSearchResponse,
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

test("healthbook X query builder supports curated usernames and default topic filters", () => {
  const configs = buildHealthbookXSearchConfigs({
    HEALTHBOOK_X_USERNAMES: "PeterAttiaMD, statnews",
    HEALTHBOOK_X_TOPIC_QUERY: "(longevity OR wearable)",
  });

  assert.equal(configs.length, 1);
  assert.equal(configs[0].label, "X / @peterattiamd, @statnews");
  assert.match(configs[0].query, /\(from:peterattiamd OR from:statnews\)/);
  assert.match(configs[0].query, /\(longevity OR wearable\)/);
  assert.match(configs[0].query, /lang:en -is:retweet -is:reply/);
});

test("healthbook maps X recent-search responses into feed items", () => {
  const items = mapHealthbookXSearchResponse({
    data: [
      {
        id: "12345",
        author_id: "u1",
        created_at: "2026-03-12T12:00:00Z",
        text: "New wearable biomarker study suggests better glucose detection for preventive care. https://t.co/demo",
        public_metrics: {
          like_count: 120,
          retweet_count: 30,
          reply_count: 8,
          quote_count: 5,
        },
        entities: {
          urls: [
            {
              expanded_url: "https://example.com/wearable-study",
            },
          ],
        },
      },
    ],
    includes: {
      users: [
        {
          id: "u1",
          name: "Peter Attia",
          username: "PeterAttiaMD",
        },
      ],
    },
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].sourceType, "X");
  assert.equal(items[0].sourceLabel, "X / @PeterAttiaMD");
  assert.equal(items[0].url, "https://example.com/wearable-study");
  assert.match(items[0].source, /@PeterAttiaMD/i);
  assert.match(items[0].title, /wearable biomarker study/i);
  assert.ok(["Clinical", "Research", "Tech & Biz"].includes(items[0].category));
  assert.ok(["Lead", "High"].includes(items[0].signal));
});
