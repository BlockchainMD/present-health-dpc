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

type FeedSeed = Omit<HealthbookFeedItem, "publishedAt"> & {
  minutesAgo: number;
};

const absoluteFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

function toPublishedAt(minutesAgo: number, now: number) {
  return new Date(now - minutesAgo * 60 * 1000).toISOString();
}

const feedSeeds: FeedSeed[] = [
  {
    id: "attia-x-apob-threshold",
    title:
      "Peter Attia sharpens the case for earlier ApoB action instead of waiting for obvious cardiometabolic drift",
    source: "Peter Attia",
    sourceLabel: "@PeterAttiaMD",
    sourceType: "X",
    category: "Clinical",
    minutesAgo: 8,
    url: "https://x.com/PeterAttiaMD",
    signal: "Lead",
    takeaway:
      "High-interest clinical signal because it condenses a long prevention argument into a sharper intervention threshold.",
    summary:
      "The post focuses on why prevention decisions may need to happen earlier than many clinicians are comfortable with, especially when ApoB remains elevated despite otherwise decent-looking surface markers. The useful detail is the threshold framing: who should act sooner, what data matters most, and why waiting for more visible disease often means acting too late.",
  },
  {
    id: "nature-aging-line1-heart",
    title:
      "Nature Aging highlights LINE-1-driven inflammation in the aging heart as a potential intervention path",
    source: "Nature Aging",
    sourceLabel: "Research highlight",
    sourceType: "Journals",
    category: "Research",
    minutesAgo: 17,
    url: "https://www.nature.com/nataging/volumes/6/issues/2",
    signal: "Lead",
    takeaway:
      "One of the stronger current journal signals because it ties cardiac aging to a more specific inflammatory mechanism.",
    summary:
      "The highlight points to excessive LINE-1 expression in aged cardiac tissue activating cGAS-STING signaling and contributing to dysfunction. What makes it interesting is that it does not just describe decline; it frames a clearer mechanistic route that could be targeted pharmacologically in aging-related cardiac dysfunction.",
  },
  {
    id: "topol-x-proteomic-clocks",
    title:
      "Eric Topol is pushing organ-specific proteomic aging clocks as a more useful disease and longevity signal than one global age score",
    source: "Eric Topol",
    sourceLabel: "@EricTopol",
    sourceType: "X",
    category: "Research",
    minutesAgo: 26,
    url: "https://x.com/EricTopol",
    signal: "Lead",
    takeaway:
      "This feels more interesting than generic biological age discourse because it gets closer to organ-level risk and intervention targeting.",
    summary:
      "The thread centers on the idea that aging does not advance uniformly across tissues, so a single biological age output can hide the actual risk landscape. Organ-specific proteomic clocks are compelling because they may offer a more actionable map of where disease vulnerability is accumulating first.",
  },
  {
    id: "pubmed-lookahead-geroscience",
    title:
      "Look AHEAD is being reframed through geroscience, reinforcing lifestyle intervention as a biological aging strategy",
    source: "PubMed",
    sourceLabel: "Diabetes Care paper",
    sourceType: "Journals",
    category: "Clinical",
    minutesAgo: 34,
    url: "https://pubmed.ncbi.nlm.nih.gov/41575388/",
    signal: "High",
    takeaway:
      "The paper matters because it translates long-running lifestyle trial evidence into an explicit aging framework.",
    summary:
      "This retrospective reframing of Look AHEAD argues that the trial should not only be read through diabetes and cardiovascular endpoints, but also through the lens of slowed biological aging. It gives prevention operators a more coherent rationale for pairing lifestyle intensity with healthspan language instead of treating those as separate conversations.",
  },
  {
    id: "foundmyfitness-x-protein-distribution",
    title:
      "FoundMyFitness thread on protein distribution argues that timing and meal structure still get underplayed in aging nutrition",
    source: "FoundMyFitness",
    sourceLabel: "@foundmyfitness",
    sourceType: "X",
    category: "Protocols",
    minutesAgo: 43,
    url: "https://x.com/foundmyfitness",
    signal: "High",
    takeaway:
      "Practical and high-yield because it turns protein guidance into something closer to a daily operating system.",
    summary:
      "The post focuses on how total daily protein can look adequate on paper while still producing weak muscle-protein-synthesis signaling across the day. The more interesting angle is not the macro target itself, but how protein is distributed, how much leucine is present per meal, and what that means for aging adults trying to preserve function.",
  },
  {
    id: "stat-prevention-benefits",
    title:
      "STAT says prevention stacks built around labs, coaching, and wearables are moving closer to employer-benefit packaging",
    source: "STAT",
    sourceLabel: "Health tech desk",
    sourceType: "News",
    category: "Tech & Biz",
    minutesAgo: 57,
    url: "https://www.statnews.com/",
    signal: "High",
    takeaway:
      "Important because distribution and reimbursement logic may shape the category faster than the science alone.",
    summary:
      "The reporting suggests that prevention products are becoming easier to sell when they look like risk-management infrastructure rather than premium wellness perks. That changes the commercial picture for longevity services by making continuous monitoring, coaching, and lab interpretation easier to justify inside employer or payer channels.",
  },
  {
    id: "oura-metabolic-readiness",
    title:
      "Oura is nudging its product further from tracking toward interpretation with a recovery-linked metabolic readiness score",
    source: "Oura",
    sourceLabel: "Product release",
    sourceType: "Companies",
    category: "Tech & Biz",
    minutesAgo: 72,
    url: "https://ouraring.com/blog/",
    signal: "Watch",
    takeaway:
      "Worth watching because wearable competition is shifting toward recommendations and risk interpretation.",
    summary:
      "The feature appears designed to translate passive physiological streams into prompts that feel more like coaching than telemetry review. That matters because the winning health products may be the ones that compress measurement, interpretation, and next action into a single loop.",
  },
  {
    id: "attia-drive-vo2-aerobic",
    title:
      "Fresh Peter Attia episode turns aerobic hierarchy into a tighter sequence for Zone 2, VO2 max, and recovery",
    source: "Peter Attia Drive",
    sourceLabel: "Episode drop",
    sourceType: "Podcasts",
    category: "Podcasts",
    minutesAgo: 88,
    url: "https://peterattiamd.com/podcast/",
    signal: "High",
    takeaway:
      "Still one of the better media signals because people actually execute training when the sequencing gets clear.",
    summary:
      "The episode sharpens how to organize weekly endurance work when someone wants healthspan outcomes instead of race preparation. The valuable part is the operational detail around spacing intensity, protecting recovery, and deciding which adaptations matter most when time is limited.",
  },
  {
    id: "biorxiv-senolytic-window",
    title:
      "New bioRxiv preprint argues senolytic benefit may depend more on timing and tissue state than on compound branding",
    source: "bioRxiv",
    sourceLabel: "Preprint",
    sourceType: "Preprints",
    category: "Research",
    minutesAgo: 103,
    url: "https://www.biorxiv.org/",
    signal: "Watch",
    takeaway:
      "Good research signal because it narrows the claim and pushes against broad anti-aging oversell.",
    summary:
      "The paper is interesting precisely because it is more constrained than the usual senolytic storyline. Instead of implying a general longevity effect, it frames the response as dependent on stage, tissue context, and treatment window, which is a much more decision-useful way to think about translational risk.",
  },
  {
    id: "youtube-circadian-timing",
    title:
      "A new long-form YouTube discussion on circadian timing is landing because it ties light exposure directly to recovery and glucose control",
    source: "YouTube",
    sourceLabel: "Lecture drop",
    sourceType: "Podcasts",
    category: "Media",
    minutesAgo: 118,
    url: "https://www.youtube.com/",
    signal: "High",
    takeaway:
      "High ROI behavior topic with unusually wide applicability across sleep, energy, and metabolic control.",
    summary:
      "The talk stays focused on mechanics: light timing, circadian phase, and what shifts first when schedule and light cues are corrected. It feels more useful than generic sleep content because it shows how one lever affects several downstream outcomes at once.",
  },
  {
    id: "labfront-x-readiness-scores",
    title:
      "Labfront thread is pushing back on overconfident wearable readiness scores and getting strong operator engagement",
    source: "Labfront",
    sourceLabel: "@labfront",
    sourceType: "X",
    category: "Media",
    minutesAgo: 136,
    url: "https://x.com/labfront",
    signal: "High",
    takeaway:
      "Interesting because it is a corrective signal in a category that tends to overstate what wearables can really infer.",
    summary:
      "The thread breaks down where HRV and readiness outputs are directionally useful and where they start to impersonate clinical truth without enough basis. Its value is in the edge-case reasoning: noisy single-day readings, weak causal interpretation, and the gap between trend analysis and medical-grade decision support.",
  },
  {
    id: "nature-aging-risk-equivalent-age",
    title:
      "Risk-equivalent age is catching attention as a cleaner way to talk about biological age in real clinical settings",
    source: "Nature Aging",
    sourceLabel: "Comment",
    sourceType: "Journals",
    category: "Clinical",
    minutesAgo: 176,
    url: "https://www.nature.com/nataging/current-issue",
    signal: "High",
    takeaway:
      "Useful because it reframes biological age as risk communication rather than a pseudo-mystical score.",
    summary:
      "The concept treats biological age as an operational expression of clinically meaningful risk instead of a claim to reveal someone's true underlying age. That is a materially better frame for prevention products, because risk-equivalent age is easier to tie to action thresholds and clinical discussion.",
  },
  {
    id: "pubmed-cgm-behavior-change",
    title:
      "Intermittent CGM use in non-diabetic adults appears to move behavior faster than it moves durable biomarkers",
    source: "PubMed",
    sourceLabel: "Clinical paper",
    sourceType: "Journals",
    category: "Clinical",
    minutesAgo: 198,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    signal: "High",
    takeaway:
      "Good clinical signal because it separates engagement effects from hard physiologic change.",
    summary:
      "The paper suggests CGMs are currently stronger as awareness and adherence tools than as guaranteed drivers of measurable metabolic improvement in healthy users. That distinction matters if consumer prevention products are going to make stronger claims than the evidence can support.",
  },
  {
    id: "fmf-x-creatine-cognition",
    title:
      "Creatine and cognition is moving again on X, but the better posts are finally distinguishing plausible use cases from hype",
    source: "FoundMyFitness",
    sourceLabel: "@foundmyfitness",
    sourceType: "X",
    category: "Protocols",
    minutesAgo: 223,
    url: "https://x.com/foundmyfitness",
    signal: "Watch",
    takeaway:
      "Still useful because protocol users need stronger dose and evidence boundaries than supplement marketing provides.",
    summary:
      "The more substantive thread versions are focusing on where creatine may have cognitive relevance, where the human evidence is still sparse, and how expectations should change based on context. That makes it a better fit for this feed than generic performance-supplement enthusiasm.",
  },
  {
    id: "lt-legal-playbook",
    title:
      "Longevity gets its own legal playbook as category infrastructure keeps professionalizing around healthspan companies",
    source: "Longevity.Technology",
    sourceLabel: "Industry note",
    sourceType: "News",
    category: "Tech & Biz",
    minutesAgo: 251,
    url: "https://longevity.technology/news/longevity-gets-its-own-legal-playbook-at-arentfox-schiff/",
    signal: "Watch",
    takeaway:
      "Not flashy science, but it is a real signal that the longevity market is becoming institutionally legible.",
    summary:
      "This kind of legal and advisory specialization shows up when a category starts to attract enough capital, regulatory complexity, and transaction volume to justify dedicated expertise. It is less about one firm and more about the sector becoming a recognizable business domain.",
  },
  {
    id: "nature-aging-reserve-capacity",
    title:
      "Reserve capacity keeps emerging as a better healthspan lens than baseline fitness snapshots alone",
    source: "Nature Aging",
    sourceLabel: "Journal release",
    sourceType: "Journals",
    category: "Research",
    minutesAgo: 325,
    url: "https://www.nature.com/nataging/",
    signal: "Lead",
    takeaway:
      "Important framing shift because resilience and recovery capacity are more decision-useful than vanity metrics.",
    summary:
      "The underlying argument is that healthy aging is partly defined by how much stress a system can absorb and recover from, not just by where it sits on a static performance measure. That makes reserve capacity a stronger organizing idea for training, nutrition, and prevention programs.",
  },
  {
    id: "pubmed-overnight-glucose-tre",
    title:
      "Meal-timing papers keep converging on the same point: overnight glucose often improves sooner than broader daytime metrics",
    source: "PubMed",
    sourceLabel: "Clinical paper",
    sourceType: "Journals",
    category: "Clinical",
    minutesAgo: 621,
    url: "https://pubmed.ncbi.nlm.nih.gov/",
    signal: "High",
    takeaway:
      "Useful because it clarifies where time-restricted eating tends to show signal first.",
    summary:
      "The best-read clinical papers in this zone are converging on a bounded message: meal timing appears to help, but the improvement may concentrate in specific glycemic windows rather than transforming every marker at once. That is more useful than treating fasting as a universal lever.",
  },
];

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

export function getHealthbookFeedItems(now = Date.now()) {
  return feedSeeds
    .map((item) => ({
      ...item,
      publishedAt: toPublishedAt(item.minutesAgo, now),
    }))
    .sort(
      (left, right) =>
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    );
}
