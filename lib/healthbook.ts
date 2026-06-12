import Parser from "rss-parser";

export const HEALTHBOOK_CATEGORIES = [
  "All",
  "Research",
  "Clinical",
  "Protocols",
  "Podcasts",
  "Media",
  "Tech & Biz",
] as const;

export const HEALTHBOOK_SOURCE_TYPES = [
  "All Sources",
  "Journals",
  "X",
  "Preprints",
  "Podcasts",
  "News",
  "Companies",
] as const;

export type HealthbookCategory = (typeof HEALTHBOOK_CATEGORIES)[number];
export type HealthbookSourceType = (typeof HEALTHBOOK_SOURCE_TYPES)[number];
export type HealthbookSignalLevel = "Lead" | "High" | "Watch";

export type HealthbookFeedItem = {
  id: string;
  title: string;
  source: string;
  sourceLabel: string;
  sourceType: Exclude<HealthbookSourceType, "All Sources">;
  category: Exclude<HealthbookCategory, "All">;
  publishedAt: string;
  url: string;
  takeaway: string;
  summary: string;
  signal: HealthbookSignalLevel;
};

export type HealthbookBriefIntent =
  | "INFORMATIONAL"
  | "TRANSACTIONAL"
  | "COMMERCIAL"
  | "NAVIGATIONAL";

export type HealthbookBriefSeed = {
  targetKeyword: string;
  searchIntent: HealthbookBriefIntent;
  targetAudience: string;
  evergreenAngle: string;
  notes: string;
};

export type HealthbookXSearchConfig = {
  label: string;
  query: string;
};

type ParsedFeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  date?: string;
  guid?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  source?: string;
  [key: string]: unknown;
};

type PreprintApiEntry = {
  title?: string;
  doi?: string;
  date?: string;
  abstract?: string;
  category?: string;
};

type PreprintApiResponse = {
  collection?: PreprintApiEntry[];
};

type XApiUrlEntity = {
  expanded_url?: string;
  unwound_url?: string;
  display_url?: string;
  url?: string;
};

type XApiTweet = {
  id?: string;
  text?: string;
  author_id?: string;
  created_at?: string;
  lang?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
  entities?: {
    urls?: XApiUrlEntity[];
  };
};

type XApiUser = {
  id?: string;
  name?: string;
  username?: string;
  verified?: boolean;
};

type XApiSearchResponse = {
  data?: XApiTweet[];
  includes?: {
    users?: XApiUser[];
  };
};

const parser = new Parser<Record<string, never>, ParsedFeedItem>();

const HEALTHBOOK_CACHE_TTL_MS = 15 * 60 * 1000;
const HEALTHBOOK_SOURCE_TIMEOUT_MS = 8_000;
const HEALTHBOOK_MAX_ITEMS = 24;
const HEALTHBOOK_MAX_ITEMS_PER_SOURCE = 4;
const HEALTHBOOK_RECENCY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const GOOGLE_NEWS_QUERIES = ["healthspan", "wearable health"] as const;
const DEFAULT_HEALTHBOOK_X_TOPIC_QUERY =
  '(longevity OR healthspan OR aging OR wearable OR biomarker OR metabolic OR prevention OR exercise OR sleep OR "primary care" OR telehealth)';
const HEALTHBOOK_X_USER_QUERY_CHUNK_SIZE = 4;
const HEALTHBOOK_X_DEFAULT_MAX_RESULTS = 10;

const absoluteFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

const RELEVANCE_PATTERNS = [
  /\baging\b/i,
  /\blongevity\b/i,
  /\bhealthspan\b/i,
  /\bpreventive\b/i,
  /\bprevention\b/i,
  /\bmetabolic\b/i,
  /\bdiabetes\b/i,
  /\bglucose\b/i,
  /\binsulin\b/i,
  /\bcardio/i,
  /\bheart\b/i,
  /\bcholesterol\b/i,
  /\bapob\b/i,
  /\bhypertension\b/i,
  /\bblood pressure\b/i,
  /\bsleep\b/i,
  /\bcircadian\b/i,
  /\bexercise\b/i,
  /\bfitness\b/i,
  /\btraining\b/i,
  /\bvo2\b/i,
  /\bmuscle\b/i,
  /\bprotein\b/i,
  /\bcreatine\b/i,
  /\bsauna\b/i,
  /\bwearable\b/i,
  /\bbiosensor\b/i,
  /\bbiomarker\b/i,
  /\bsenescence\b/i,
  /\bsenolytic\b/i,
  /\binflammation\b/i,
  /\bprimary care\b/i,
  /\btelehealth\b/i,
];

const CLINICAL_PATTERNS = [
  /\btrial\b/i,
  /\bpatients?\b/i,
  /\btherapy\b/i,
  /\btreatment\b/i,
  /\bscreening\b/i,
  /\bdiabetes\b/i,
  /\bkidney\b/i,
  /\bmyocardial\b/i,
  /\bhypertension\b/i,
  /\bblood pressure\b/i,
  /\bcholesterol\b/i,
  /\bglp-1\b/i,
  /\bobesity\b/i,
  /\bcancer\b/i,
  /\bdepression\b/i,
  /\bprimary care\b/i,
];

const PROTOCOL_PATTERNS = [
  /\bzone 2\b/i,
  /\bfasting\b/i,
  /\bnutrition\b/i,
  /\bdiet\b/i,
  /\bexercise\b/i,
  /\btraining\b/i,
  /\bprotein\b/i,
  /\bcreatine\b/i,
  /\bsauna\b/i,
  /\bsleep hygiene\b/i,
  /\brecovery\b/i,
  /\bmeal timing\b/i,
];

const TECH_AND_BIZ_PATTERNS = [
  /\bwearable\b/i,
  /\bbiosensor\b/i,
  /\bdevice\b/i,
  /\bcompany\b/i,
  /\bstartup\b/i,
  /\bfunding\b/i,
  /\bbenefit\b/i,
  /\bemployer\b/i,
  /\bplatform\b/i,
  /\bsoftware\b/i,
  /\blaunches?\b/i,
  /\binitiative\b/i,
];

const HIGH_SIGNAL_PATTERNS = [
  /\btrial\b/i,
  /\bstudy\b/i,
  /\bresearch\b/i,
  /\bhealthspan\b/i,
  /\blongevity\b/i,
  /\baging\b/i,
  /\bmetabolic\b/i,
  /\bwearable\b/i,
  /\bbiomarker\b/i,
];

let healthbookCache: {
  items: HealthbookFeedItem[];
  fetchedAt: number;
  refreshPromise: Promise<HealthbookFeedItem[]> | null;
} = {
  items: [],
  fetchedAt: 0,
  refreshPromise: null,
};

export function getHealthbookPublishedDate(publishedAt: string) {
  return new Date(publishedAt);
}

export function formatHealthbookAbsoluteTimestamp(publishedAt: string) {
  return `${absoluteFormatter.format(getHealthbookPublishedDate(publishedAt))} ET`;
}

export function formatHealthbookRelativeTimestamp(publishedAt: string, now: number) {
  const diffInMinutes = Math.max(
    0,
    Math.floor((now - getHealthbookPublishedDate(publishedAt).getTime()) / 60000),
  );

  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}

export function countHealthbookItemsWithinHours(
  items: { publishedAt: string }[],
  hours: number,
  now: number,
) {
  const threshold = now - hours * 60 * 60 * 1000;

  return items.filter((item) => getHealthbookPublishedDate(item.publishedAt).getTime() >= threshold).length;
}

export function sortHealthbookFeedItems<T extends { publishedAt: string }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      getHealthbookPublishedDate(right.publishedAt).getTime() -
      getHealthbookPublishedDate(left.publishedAt).getTime(),
  );
}

export function curateHealthbookFeedItems(items: HealthbookFeedItem[], now = Date.now()) {
  const seenTitles = new Set<string>();
  const perSourceCounts = new Map<string, number>();
  const curated: HealthbookFeedItem[] = [];
  const threshold = now - HEALTHBOOK_RECENCY_WINDOW_MS;

  for (const item of sortHealthbookFeedItems(items)) {
    const publishedAt = getHealthbookPublishedDate(item.publishedAt).getTime();
    if (!item.title || !item.url || Number.isNaN(publishedAt) || publishedAt < threshold) {
      continue;
    }

    const normalizedTitle = normalizeTitleForDedupe(item.title);
    if (seenTitles.has(normalizedTitle)) {
      continue;
    }

    const sourceCount = perSourceCounts.get(item.sourceLabel) ?? 0;
    if (sourceCount >= HEALTHBOOK_MAX_ITEMS_PER_SOURCE) {
      continue;
    }

    seenTitles.add(normalizedTitle);
    perSourceCounts.set(item.sourceLabel, sourceCount + 1);
    curated.push(item);

    if (curated.length >= HEALTHBOOK_MAX_ITEMS) {
      break;
    }
  }

  return curated;
}

export function buildHealthbookBriefSeed(item: HealthbookFeedItem): HealthbookBriefSeed {
  const targetKeyword = deriveHealthbookTargetKeyword(item);
  const searchIntent: HealthbookBriefIntent =
    item.category === "Tech & Biz" ? "COMMERCIAL" : "INFORMATIONAL";
  const evergreenAngle = buildHealthbookEvergreenAngle(item);

  return {
    targetKeyword,
    searchIntent,
    targetAudience: buildHealthbookTargetAudience(item),
    evergreenAngle,
    notes: [
      `Healthbook signal source: ${item.source} (${item.sourceType})`,
      `Signal strength: ${item.signal}`,
      `Category: ${item.category}`,
      `Published at: ${item.publishedAt}`,
      `Original title: ${item.title}`,
      `Takeaway: ${item.takeaway}`,
      `Summary: ${item.summary}`,
      `Evergreen framing: ${evergreenAngle}`,
      `Source URL: ${item.url}`,
      "Use this signal as discovery context only. Turn it into an evergreen patient-search article instead of a news recap.",
    ].join("\n\n"),
  };
}

export function buildHealthbookXSearchConfigs(
  env: Record<string, string | undefined> = process.env,
): HealthbookXSearchConfig[] {
  const directQuery = normalizeWhitespace(
    env.HEALTHBOOK_X_SEARCH_QUERY || env.HEALTHBOOK_X_QUERY || "",
  );
  if (directQuery) {
    return [{ label: "X / custom search", query: directQuery }];
  }

  const usernames = parseHealthbookXUsernames(
    env.HEALTHBOOK_X_USERNAMES || env.HEALTHBOOK_X_ACCOUNTS || env.HEALTHBOOK_X_HANDLES || "",
  );
  const topicQuery =
    normalizeWhitespace(env.HEALTHBOOK_X_TOPIC_QUERY || "") || DEFAULT_HEALTHBOOK_X_TOPIC_QUERY;
  const filters = "lang:en -is:retweet -is:reply";

  if (!usernames.length) {
    return [{ label: "X / trending health", query: normalizeWhitespace(`${topicQuery} ${filters}`) }];
  }

  return chunkArray(usernames, HEALTHBOOK_X_USER_QUERY_CHUNK_SIZE).map((chunk) => ({
    label: chunk.length === 1 ? `X / @${chunk[0]}` : `X / ${chunk.map((item) => `@${item}`).join(", ")}`,
    query: normalizeWhitespace(`(${chunk.map((item) => `from:${item}`).join(" OR ")}) (${topicQuery}) ${filters}`),
  }));
}

export function mapHealthbookXSearchResponse(
  response: XApiSearchResponse,
  fallbackLabel = "X / recent search",
): HealthbookFeedItem[] {
  const users = new Map<string, XApiUser>();
  for (const user of response.includes?.users || []) {
    if (user.id) {
      users.set(user.id, user);
    }
  }

  const mappedItems: Array<HealthbookFeedItem | null> = (response.data || []).map((tweet) => {
    const text = normalizeHealthbookXText(tweet.text || "");
    const publishedAt = toIsoDate(tweet.created_at);
    const author = tweet.author_id ? users.get(tweet.author_id) : undefined;
    const canonicalUrl = buildHealthbookXTweetUrl(author?.username, tweet.id);
    const url = pickHealthbookXDestinationUrl(tweet.entities?.urls || [], canonicalUrl);
    const source = formatHealthbookXSource(author);
    const sourceLabel = author?.username ? `X / @${author.username}` : fallbackLabel;

    if (!text || !publishedAt || !url) {
      return null;
    }

    const title = buildHealthbookXTitle(text);
    const category = inferHealthbookCategory({
      title,
      source,
      sourceType: "X",
      summaryText: text,
      defaultCategory: "Media",
    });
    const signal = inferHealthbookSignal({
      title,
      sourceType: "X",
      category,
      publishedAt,
      xEngagementScore: getHealthbookXEngagementScore(tweet.public_metrics),
    });

    return {
      id: buildHealthbookId(sourceLabel, title, canonicalUrl || url),
      title,
      source,
      sourceLabel,
      sourceType: "X" as const,
      category,
      publishedAt,
      url,
      takeaway: buildHealthbookTakeaway({ source, sourceType: "X", category }),
      summary: buildHealthbookSummary({
        source,
        sourceType: "X",
        rawSummary: text,
        title,
      }),
      signal,
    } satisfies HealthbookFeedItem;
  });

  return mappedItems.filter(isHealthbookFeedItem);
}

export async function getHealthbookFeedItems(now = Date.now()) {
  const cacheAgeMs = Date.now() - healthbookCache.fetchedAt;
  if (healthbookCache.items.length && cacheAgeMs < HEALTHBOOK_CACHE_TTL_MS) {
    return healthbookCache.items;
  }

  if (healthbookCache.refreshPromise) {
    return healthbookCache.refreshPromise;
  }

  healthbookCache.refreshPromise = refreshHealthbookFeed(now).finally(() => {
    healthbookCache.refreshPromise = null;
  });

  return healthbookCache.refreshPromise;
}

export async function getHealthbookFeedSnapshot(now = Date.now()) {
  const items = await getHealthbookFeedItems(now);

  return {
    items,
    generatedAt: Date.now(),
  };
}

async function refreshHealthbookFeed(now: number) {
  const sourceResults = await Promise.allSettled([
    loadHealthbookXFeedItems(),
    loadPeterAttiaFeedItems(),
    loadNejmFeedItems(),
    loadStatFeedItems(),
    loadLongevityTechnologyFeedItems(),
    ...GOOGLE_NEWS_QUERIES.map((query) => loadGoogleNewsFeedItems(query)),
    loadPreprintFeedItems("medrxiv", now),
    loadPreprintFeedItems("biorxiv", now),
  ]);

  const liveItems: HealthbookFeedItem[] = [];

  for (const [index, result] of sourceResults.entries()) {
    if (result.status === "fulfilled") {
      liveItems.push(...result.value.filter(isHealthbookFeedItem));
      continue;
    }

    console.error("[Healthbook] Source failed", {
      sourceIndex: index,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  }

  const items = curateHealthbookFeedItems(liveItems, now);

  if (items.length) {
    healthbookCache = {
      items,
      fetchedAt: Date.now(),
      refreshPromise: null,
    };
    return items;
  }

  if (healthbookCache.items.length) {
    return healthbookCache.items;
  }

  healthbookCache = {
    items: [],
    fetchedAt: Date.now(),
    refreshPromise: null,
  };

  return [];
}

async function loadHealthbookXFeedItems(): Promise<HealthbookFeedItem[]> {
  const bearerToken = getHealthbookXBearerToken();
  if (!bearerToken) {
    return [];
  }

  const searchConfigs = buildHealthbookXSearchConfigs();
  if (!searchConfigs.length) {
    return [];
  }

  const queryResults = await Promise.allSettled(
    searchConfigs.map((config) => fetchHealthbookXQuery(config, bearerToken)),
  );

  const items: HealthbookFeedItem[] = [];

  for (const [index, result] of queryResults.entries()) {
    if (result.status === "fulfilled") {
      items.push(...result.value);
      continue;
    }

    console.error("[Healthbook] X query failed", {
      queryLabel: searchConfigs[index]?.label || `query-${index + 1}`,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
  }

  return items;
}

async function loadPeterAttiaFeedItems(): Promise<HealthbookFeedItem[]> {
  const feed = await parseFeed("https://peterattiamd.com/feed/");

  return buildItemsFromRss(feed.items.slice(0, 6), {
    source: "Peter Attia",
    sourceLabel: "Podcast feed",
    sourceType: "Podcasts",
    defaultCategory: "Podcasts",
  });
}

async function loadNejmFeedItems(): Promise<HealthbookFeedItem[]> {
  const feed = await parseFeed("https://www.nejm.org/action/showFeed?type=etoc&feed=rss&jc=nejm");

  return buildItemsFromRss(feed.items, {
    source: "NEJM",
    sourceLabel: "Current issue",
    sourceType: "Journals",
    defaultCategory: "Clinical",
    requireRelevance: true,
  });
}

async function loadStatFeedItems(): Promise<HealthbookFeedItem[]> {
  const feed = await parseFeed("https://www.statnews.com/feed/");

  return buildItemsFromRss(feed.items, {
    source: "STAT",
    sourceLabel: "News feed",
    sourceType: "News",
    defaultCategory: "Media",
    requireRelevance: true,
  });
}

async function loadLongevityTechnologyFeedItems(): Promise<HealthbookFeedItem[]> {
  const feed = await parseFeed("https://longevity.technology/feed/");

  return buildItemsFromRss(feed.items, {
    source: "Longevity.Technology",
    sourceLabel: "Longevity news",
    sourceType: "News",
    defaultCategory: "Tech & Biz",
  });
}

async function loadGoogleNewsFeedItems(
  query: (typeof GOOGLE_NEWS_QUERIES)[number],
): Promise<HealthbookFeedItem[]> {
  const encodedQuery = encodeURIComponent(query);
  const feed = await parseFeed(
    `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`,
  );

  const mappedItems: Array<HealthbookFeedItem | null> = feed.items
    .map((item) => {
      const publishedAt = getParsedFeedItemDate(item);
      const url = normalizeUrl(item.link);
      const rawTitle = normalizeWhitespace(item.title || "");
      const { title, source } = splitGoogleNewsTitle(rawTitle);

      if (!title || !source || !publishedAt || !url) {
        return null;
      }

      const summaryText = getParsedFeedItemSnippet(item);
      if (!isHealthbookRelevant(`${title} ${summaryText}`)) {
        return null;
      }

      const category = inferHealthbookCategory({
        title,
        source,
        sourceType: "News",
        summaryText,
      });
      const signal = inferHealthbookSignal({
        title,
        sourceType: "News",
        category,
        publishedAt,
      });

      return {
        id: buildHealthbookId(source, title, url),
        title,
        source,
        sourceLabel: `Google News / ${query}`,
        sourceType: "News" as const,
        category,
        publishedAt,
        url,
        takeaway: buildHealthbookTakeaway({ source, sourceType: "News", category }),
        summary: buildHealthbookSummary({
          source,
          sourceType: "News",
          rawSummary: summaryText,
          title,
        }),
        signal,
      } satisfies HealthbookFeedItem;
    });

  return mappedItems.filter(isHealthbookFeedItem);
}

async function loadPreprintFeedItems(
  server: "medrxiv" | "biorxiv",
  now: number,
): Promise<HealthbookFeedItem[]> {
  const interval = getPreprintInterval(now);
  const response = await fetchJson<PreprintApiResponse>(
    `https://api.${server}.org/details/${server}/${interval.startDate}/${interval.endDate}`,
  );

  const items = Array.isArray(response.collection) ? response.collection : [];

  const mappedItems: Array<HealthbookFeedItem | null> = items
    .map((entry) => {
      const title = normalizeWhitespace(entry.title || "");
      const publishedAt = toIsoDate(entry.date);
      const summaryText = normalizeWhitespace(entry.abstract || "");

      if (!title || !publishedAt || !isHealthbookRelevant(`${title} ${summaryText}`)) {
        return null;
      }

      const source = server === "medrxiv" ? "medRxiv" : "bioRxiv";
      const category = inferHealthbookCategory({
        title,
        source,
        sourceType: "Preprints",
        summaryText,
      });
      const signal = inferHealthbookSignal({
        title,
        sourceType: "Preprints",
        category,
        publishedAt,
      });
      const url = normalizeUrl(entry.doi ? `https://doi.org/${entry.doi}` : "");

      if (!url) {
        return null;
      }

      return {
        id: buildHealthbookId(source, title, url),
        title,
        source,
        sourceLabel: normalizeWhitespace(entry.category || `${source} preprint`),
        sourceType: "Preprints" as const,
        category,
        publishedAt,
        url,
        takeaway: buildHealthbookTakeaway({ source, sourceType: "Preprints", category }),
        summary: buildHealthbookSummary({
          source,
          sourceType: "Preprints",
          rawSummary: summaryText,
          title,
        }),
        signal,
      } satisfies HealthbookFeedItem;
    });

  return mappedItems.filter(isHealthbookFeedItem);
}

async function fetchHealthbookXQuery(
  config: HealthbookXSearchConfig,
  bearerToken: string,
): Promise<HealthbookFeedItem[]> {
  const params = new URLSearchParams({
    query: config.query,
    max_results: String(getHealthbookXMaxResults()),
    "tweet.fields": "created_at,author_id,lang,public_metrics,entities",
    expansions: "author_id",
    "user.fields": "name,username,verified",
  });

  const response = await fetchJson<XApiSearchResponse>(
    `https://api.x.com/2/tweets/search/recent?${params.toString()}`,
    {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${bearerToken}`,
      },
    },
  );

  return mapHealthbookXSearchResponse(response, config.label);
}

async function parseFeed(url: string) {
  const xml = await fetchText(url);
  return parser.parseString(xml);
}

async function fetchText(url: string, init?: RequestInit) {
  const response = await fetchSource(url, init);
  return response.text();
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetchSource(url, init);
  return (await response.json()) as T;
}

async function fetchSource(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTHBOOK_SOURCE_TIMEOUT_MS);

  try {
    const headers = new Headers(init?.headers);
    headers.set("user-agent", "PresentHealth Healthbook/1.0 (+https://presenthealthmd.com)");

    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "follow",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${url} timed out after ${HEALTHBOOK_SOURCE_TIMEOUT_MS}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildItemsFromRss(
  items: ParsedFeedItem[],
  options: {
    source: string;
    sourceLabel: string;
    sourceType: Exclude<HealthbookSourceType, "All Sources" | "X" | "Companies">;
    defaultCategory: Exclude<HealthbookCategory, "All">;
    requireRelevance?: boolean;
  },
): HealthbookFeedItem[] {
  const mappedItems: Array<HealthbookFeedItem | null> = items
    .map((item) => {
      const title = normalizeWhitespace(item.title || "");
      const publishedAt = getParsedFeedItemDate(item);
      const url = normalizeUrl(item.link);

      if (!title || !publishedAt || !url) {
        return null;
      }

      const summaryText = getParsedFeedItemSnippet(item);
      if (options.requireRelevance && !isHealthbookRelevant(`${title} ${summaryText}`)) {
        return null;
      }

      const category = inferHealthbookCategory({
        title,
        source: options.source,
        sourceType: options.sourceType,
        summaryText,
        defaultCategory: options.defaultCategory,
      });
      const signal = inferHealthbookSignal({
        title,
        sourceType: options.sourceType,
        category,
        publishedAt,
      });

      return {
        id: buildHealthbookId(options.source, title, url),
        title,
        source: options.source,
        sourceLabel: options.sourceLabel,
        sourceType: options.sourceType,
        category,
        publishedAt,
        url,
        takeaway: buildHealthbookTakeaway({
          source: options.source,
          sourceType: options.sourceType,
          category,
        }),
        summary: buildHealthbookSummary({
          source: options.source,
          sourceType: options.sourceType,
          rawSummary: summaryText,
          title,
        }),
        signal,
      } satisfies HealthbookFeedItem;
    });

  return mappedItems.filter(isHealthbookFeedItem);
}

function getParsedFeedItemDate(item: ParsedFeedItem) {
  return toIsoDate(item.isoDate || item.pubDate || item.date);
}

function getParsedFeedItemSnippet(item: ParsedFeedItem) {
  const encodedSnippet =
    typeof item["content:encodedSnippet"] === "string" ? item["content:encodedSnippet"] : "";
  const encodedContent = typeof item["content:encoded"] === "string" ? item["content:encoded"] : "";

  return normalizeSummaryText(
    item.contentSnippet || encodedSnippet || item.content || encodedContent || "",
    item.title || "",
  );
}

function inferHealthbookCategory(params: {
  title: string;
  source: string;
  sourceType: Exclude<HealthbookSourceType, "All Sources">;
  summaryText: string;
  defaultCategory?: Exclude<HealthbookCategory, "All">;
}): Exclude<HealthbookCategory, "All"> {
  const text = `${params.title} ${params.summaryText} ${params.source}`;

  if (params.sourceType === "Podcasts") {
    return "Podcasts";
  }

  if (matchesAny(text, TECH_AND_BIZ_PATTERNS)) {
    return "Tech & Biz";
  }

  if (params.sourceType === "Journals" || params.sourceType === "Preprints") {
    return matchesAny(text, CLINICAL_PATTERNS) ? "Clinical" : "Research";
  }

  if (matchesAny(text, CLINICAL_PATTERNS)) {
    return "Clinical";
  }

  if (matchesAny(text, PROTOCOL_PATTERNS)) {
    return "Protocols";
  }

  return params.defaultCategory || "Media";
}

function inferHealthbookSignal(params: {
  title: string;
  sourceType: Exclude<HealthbookSourceType, "All Sources">;
  category: Exclude<HealthbookCategory, "All">;
  publishedAt: string;
  xEngagementScore?: number;
}) {
  let score = 0;

  if (params.sourceType === "Journals") {
    score += 3;
  } else if (params.sourceType === "Preprints") {
    score += 2;
  } else if (params.sourceType === "Podcasts") {
    score += 1;
  }

  if (params.category === "Clinical" || params.category === "Research") {
    score += 1;
  }

  if (matchesAny(params.title, HIGH_SIGNAL_PATTERNS)) {
    score += 1;
  }

  if (params.sourceType === "X") {
    const xEngagementScore = params.xEngagementScore ?? 0;
    if (xEngagementScore >= 250) {
      score += 2;
    } else if (xEngagementScore >= 75) {
      score += 1;
    }
  }

  const ageHours = (Date.now() - getHealthbookPublishedDate(params.publishedAt).getTime()) / (60 * 60 * 1000);
  if (ageHours <= 72) {
    score += 1;
  }

  if (score >= 5) {
    return "Lead";
  }

  if (score >= 3) {
    return "High";
  }

  return "Watch";
}

function buildHealthbookTakeaway(params: {
  source: string;
  sourceType: Exclude<HealthbookSourceType, "All Sources">;
  category: Exclude<HealthbookCategory, "All">;
}) {
  const categoryLeadIn: Record<Exclude<HealthbookCategory, "All">, string> = {
    Research: "Research signal",
    Clinical: "Clinical signal",
    Protocols: "Protocol signal",
    Podcasts: "Podcast signal",
    Media: "Media signal",
    "Tech & Biz": "Market signal",
  };

  const sourceFrame: Record<Exclude<HealthbookSourceType, "All Sources">, string> = {
    Journals: "Peer-reviewed source; review the methods and population before acting on it.",
    X: "Social signal only; verify the underlying evidence before treating it as durable.",
    Preprints: "Preprint only; use it directionally until peer review lands.",
    Podcasts: "Useful for frameworks and context, not as standalone clinical guidance.",
    News: "Useful for tracking the category and the underlying study or company move.",
    Companies: "Company source; good for product movement, not independent validation.",
  };

  return truncateText(
    `${categoryLeadIn[params.category]} from ${params.source}. ${sourceFrame[params.sourceType]}`,
    180,
  );
}

function buildHealthbookSummary(params: {
  source: string;
  sourceType: Exclude<HealthbookSourceType, "All Sources">;
  rawSummary: string;
  title: string;
}) {
  const cleanedSummary = normalizeSummaryText(params.rawSummary, params.title);
  if (cleanedSummary) {
    return truncateText(cleanedSummary, 320);
  }

  const fallbackBySourceType: Record<Exclude<HealthbookSourceType, "All Sources">, string> = {
    Journals: "Open the source for the full paper details, study design, and clinical context.",
    X: "Open the source to review the original thread and any linked evidence.",
    Preprints: "Open the source to review the abstract, methods, and limitations before using it.",
    Podcasts: "Open the source for the full episode notes and long-form discussion.",
    News: "Open the source for the full article and any linked research or product details.",
    Companies: "Open the source for the original release and product context.",
  };

  return `${params.source}: ${fallbackBySourceType[params.sourceType]}`;
}

function getPreprintInterval(now: number) {
  const endDate = new Date(now);
  const startDate = new Date(now - 14 * 24 * 60 * 60 * 1000);

  return {
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
  };
}

function formatDateForApi(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildHealthbookId(source: string, title: string, url: string) {
  const input = `${source}|${title}|${url}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = Math.imul(h2 ^ code, 0x5bd1e995);
  }

  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

function isHealthbookRelevant(text: string) {
  return matchesAny(text, RELEVANCE_PATTERNS);
}

function normalizeSummaryText(text: string, title = "") {
  const cleaned = normalizeWhitespace(
    decodeHtmlEntities(stripHtml(text))
      .replace(/The post .*? appeared first on .*$/i, "")
      .replace(/Want to stay on top of .*? inbox\./i, "")
      .replace(/^\s*New England Journal of Medicine,\s*/i, ""),
  );

  if (!cleaned) {
    return "";
  }

  const normalizedTitle = normalizeWhitespace(title).toLowerCase();
  if (normalizedTitle && cleaned.toLowerCase() === normalizedTitle) {
    return "";
  }

  if (normalizedTitle && cleaned.toLowerCase().startsWith(normalizedTitle.toLowerCase())) {
    const trimmed = normalizeWhitespace(cleaned.slice(title.length));
    if (trimmed.length >= 32) {
      return trimmed;
    }
  }

  return cleaned;
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, " ");
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  if (lastSpaceIndex >= Math.floor(maxLength * 0.6)) {
    return `${truncated.slice(0, lastSpaceIndex).trimEnd()}...`;
  }

  return `${truncated.trimEnd()}...`;
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getHealthbookXBearerToken(env: Record<string, string | undefined> = process.env) {
  return normalizeWhitespace(
    env.HEALTHBOOK_X_BEARER_TOKEN || env.X_BEARER_TOKEN || env.TWITTER_BEARER_TOKEN || "",
  );
}

function getHealthbookXMaxResults(env: Record<string, string | undefined> = process.env) {
  const raw = Number.parseInt(env.HEALTHBOOK_X_MAX_RESULTS || "", 10);
  if (!Number.isFinite(raw)) {
    return HEALTHBOOK_X_DEFAULT_MAX_RESULTS;
  }

  return Math.min(100, Math.max(10, raw));
}

function parseHealthbookXUsernames(value: string) {
  const usernames: string[] = [];
  const seen = new Set<string>();

  for (const part of value.split(/[\n,]/g)) {
    const normalized = normalizeWhitespace(part).replace(/^@+/, "").toLowerCase();
    if (!normalized || !/^[a-z0-9_]{1,15}$/.test(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    usernames.push(normalized);
  }

  return usernames;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeHealthbookXText(text: string) {
  return normalizeWhitespace(
    text
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/(^|\s)@([a-z0-9_]{1,15})/gi, "$1")
      .replace(/#/g, ""),
  );
}

function buildHealthbookXTitle(text: string) {
  const firstSentence = normalizeWhitespace(text.split(/(?<=[.!?])\s+/)[0] || "");

  if (firstSentence.length >= 24 && firstSentence.length <= 110) {
    return firstSentence;
  }

  return truncateText(text, 110);
}

function formatHealthbookXSource(author?: XApiUser) {
  const username = normalizeWhitespace(author?.username || "");
  const name = normalizeWhitespace(author?.name || "");

  if (name && username) {
    return `${name} (@${username})`;
  }

  if (username) {
    return `@${username}`;
  }

  if (name) {
    return name;
  }

  return "X";
}

function buildHealthbookXTweetUrl(username?: string, tweetId?: string) {
  const cleanUsername = normalizeWhitespace(username || "").replace(/^@+/, "");
  const cleanTweetId = normalizeWhitespace(tweetId || "");

  if (!cleanUsername || !cleanTweetId) {
    return "";
  }

  return normalizeUrl(`https://x.com/${cleanUsername}/status/${cleanTweetId}`);
}

function pickHealthbookXDestinationUrl(urls: XApiUrlEntity[], canonicalUrl: string) {
  for (const entity of urls) {
    const candidate = normalizeUrl(entity.unwound_url || entity.expanded_url || "");
    if (candidate && !isHealthbookXOwnedUrl(candidate)) {
      return candidate;
    }
  }

  return canonicalUrl;
}

function isHealthbookXOwnedUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "t.co" ||
      hostname === "x.com" ||
      hostname.endsWith(".x.com") ||
      hostname === "twitter.com" ||
      hostname.endsWith(".twitter.com")
    );
  } catch {
    return false;
  }
}

function getHealthbookXEngagementScore(metrics?: XApiTweet["public_metrics"]) {
  if (!metrics) {
    return 0;
  }

  const likes = Number(metrics.like_count || 0);
  const retweets = Number(metrics.retweet_count || 0);
  const replies = Number(metrics.reply_count || 0);
  const quotes = Number(metrics.quote_count || 0);

  return likes + retweets * 4 + replies * 2 + quotes * 3;
}

function normalizeUrl(url?: string) {
  const trimmed = normalizeWhitespace(url || "");
  if (!trimmed) {
    return "";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return "";
  }
}

function toIsoDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeTitleForDedupe(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function matchesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function deriveHealthbookTargetKeyword(item: HealthbookFeedItem) {
  const text = `${item.title} ${item.summary}`;

  if (/\bwearable\b/i.test(text)) return "wearable health trackers";
  if (/\bhealthspan\b/i.test(text)) return "healthspan";
  if (/\bglp-1\b/i.test(text)) return "glp-1 benefits and risks";
  if (/\bsleep\b/i.test(text)) return "how sleep affects long-term health";
  if (/\bblood pressure\b/i.test(text)) return "how to improve blood pressure";
  if (/\bprotein\b/i.test(text)) return "protein intake for healthy aging";
  if (/\bexercise\b|\btraining\b|\bzone 2\b|\bvo2\b/i.test(text)) return "exercise for longevity";
  if (/\bmetabolic\b|\bglucose\b|\binsulin\b|\bdiabetes\b/i.test(text)) return "metabolic health";

  const cleanedTitle = normalizeWhitespace(
    item.title
      .replace(/[^\w\s-]/g, " ")
      .replace(/\b(latest|fresh|new|study|trial|guidance|release|releases|issue)\b/gi, " "),
  );

  return truncateText(cleanedTitle.toLowerCase(), 72);
}

function buildHealthbookTargetAudience(item: HealthbookFeedItem) {
  if (item.category === "Tech & Biz") {
    return "Adults comparing preventive health tools, wearables, and new health products who want evidence-based context before buying or trying them.";
  }

  if (item.category === "Protocols" || item.category === "Podcasts") {
    return "Adults looking for practical, evidence-aware prevention and healthspan guidance they can discuss with a physician.";
  }

  return "Adults researching evidence-based prevention, longevity, and primary care topics who want plain-English explanations and practical next steps.";
}

function buildHealthbookEvergreenAngle(item: HealthbookFeedItem) {
  if (item.category === "Tech & Biz") {
    return "Use the signal to build an evergreen comparison or explainer that helps readers decide whether the tool or trend is actually useful, overhyped, or too early.";
  }

  if (item.category === "Protocols" || item.category === "Podcasts") {
    return "Turn the signal into a practical habit guide with guardrails, not a recap of the source episode or discussion.";
  }

  if (item.category === "Research" || item.category === "Clinical") {
    return "Translate the signal into what patients should know, who it may matter for, and what questions are reasonable to bring to a physician.";
  }

  return "Use the signal as a topic hook, then write for the evergreen patient search intent behind it rather than the momentary news cycle.";
}

function splitGoogleNewsTitle(rawTitle: string) {
  const segments = rawTitle.split(" - ").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length < 2) {
    return { title: rawTitle, source: "Google News" };
  }

  return {
    title: segments.slice(0, -1).join(" - "),
    source: segments.at(-1) || "Google News",
  };
}

function isHealthbookFeedItem(item: HealthbookFeedItem | null): item is HealthbookFeedItem {
  return item !== null;
}
