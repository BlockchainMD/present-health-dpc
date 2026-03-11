type MetricSnapshot = {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    ctr: number;
    cvr: number;
    cpa: number;
};

export type ExperimentMemoryRunInput = {
    createdAt?: Date | string | null;
    status?: string | null;
    googleCampaignId?: string | null;
    metaCampaignId?: string | null;
    rsaHeadlines?: string[] | null;
    rsaDescriptions?: string[] | null;
    metrics?: unknown;
};

export type ExperimentMemorySummary = {
    testedRuns: number;
    winningThemes: string[];
    cautionThemes: string[];
    topPerformerSummaries: string[];
    underperformerSummaries: string[];
    promptText: string;
};

type ThemeDefinition = {
    key: string;
    label: string;
    keywords: string[];
};

const THEME_DEFINITIONS: ThemeDefinition[] = [
    {
        key: "messaging",
        label: "messaging-first access",
        keywords: ["text", "message", "messaging", "voice memo", "photo"],
    },
    {
        key: "speed",
        label: "speed and no-wait convenience",
        keywords: ["same day", "quick", "fast", "today", "no wait", "no waiting room", "waiting room"],
    },
    {
        key: "price",
        label: "transparent monthly pricing",
        keywords: ["$99", "99/mo", "99/month", "month", "monthly", "transparent pricing", "flat fee"],
    },
    {
        key: "trust",
        label: "clinical trust and credibility",
        keywords: ["board-certified", "licensed", "real answer", "doctor", "clinician", "care team"],
    },
    {
        key: "convenience",
        label: "virtual convenience",
        keywords: ["virtual", "video", "online", "from anywhere", "from home", "phone"],
    },
    {
        key: "insurance",
        label: "no-insurance simplicity",
        keywords: ["no insurance", "not insurance", "insurance hassles", "insurance paperwork"],
    },
];

function toNumber(value: unknown, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function parseMetrics(raw: unknown): MetricSnapshot {
    const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const impressions = toNumber(source.impressions);
    const clicks = toNumber(source.clicks);
    const conversions = toNumber(source.conversions);
    const cost = toNumber(source.cost);
    const ctr = toNumber(source.ctr, impressions > 0 ? clicks / impressions : 0);
    const cvr = toNumber(source.cvr, clicks > 0 ? conversions / clicks : 0);
    const cpa = toNumber(source.cpa, conversions > 0 ? cost / conversions : Number.POSITIVE_INFINITY);
    return { impressions, clicks, conversions, cost, ctr, cvr, cpa };
}

function hasLiveDeployment(run: ExperimentMemoryRunInput) {
    const status = String(run.status || "").toUpperCase();
    return Boolean(
        run.googleCampaignId ||
        run.metaCampaignId ||
        status === "DEPLOYED" ||
        status === "ACTIVE" ||
        status === "PAUSED"
    );
}

function hasEnoughSignal(metrics: MetricSnapshot) {
    return metrics.conversions > 0 || metrics.clicks >= 20 || metrics.impressions >= 250 || metrics.cost >= 25;
}

function performanceScore(metrics: MetricSnapshot) {
    const cpaPenalty = Number.isFinite(metrics.cpa) ? Math.min(metrics.cpa, 300) / 25 : 12;
    return (metrics.conversions * 40) + (metrics.cvr * 220) + (metrics.ctr * 80) - cpaPenalty;
}

function combinedCopy(run: ExperimentMemoryRunInput) {
    return [...(run.rsaHeadlines || []), ...(run.rsaDescriptions || [])].join(" ").toLowerCase();
}

function themesForRun(run: ExperimentMemoryRunInput) {
    const text = combinedCopy(run);
    const themes = new Set<string>();

    for (const theme of THEME_DEFINITIONS) {
        if (theme.keywords.some((keyword) => text.includes(keyword))) {
            themes.add(theme.key);
        }
    }

    return themes;
}

function formatPercent(value: number) {
    return `${(value * 100).toFixed(2)}%`;
}

function formatCurrency(value: number) {
    if (!Number.isFinite(value)) return "n/a";
    return `$${value.toFixed(2)}`;
}

function formatDate(value: Date | string | null | undefined) {
    if (!value) return "unknown date";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "unknown date";
    return date.toISOString().slice(0, 10);
}

function summarizeRun(run: ExperimentMemoryRunInput, metrics: MetricSnapshot) {
    const examples = [...(run.rsaHeadlines || []).slice(0, 2), ...(run.rsaDescriptions || []).slice(0, 1)]
        .filter(Boolean)
        .join(" | ");
    return `${formatDate(run.createdAt)}: CTR ${formatPercent(metrics.ctr)}, CVR ${formatPercent(metrics.cvr)}, CPA ${formatCurrency(metrics.cpa)}. Sample copy: ${examples || "n/a"}`;
}

function buildThemeLeaderboard(runs: ExperimentMemoryRunInput[]) {
    const counters = new Map<string, number>();
    for (const run of runs) {
        for (const theme of themesForRun(run)) {
            counters.set(theme, (counters.get(theme) || 0) + 1);
        }
    }
    return counters;
}

export function summarizeExperimentMemory(runs: ExperimentMemoryRunInput[]): ExperimentMemorySummary | null {
    const eligibleRuns = runs
        .filter((run) => hasLiveDeployment(run))
        .map((run) => ({
            run,
            metrics: parseMetrics(run.metrics),
        }))
        .filter(({ metrics }) => hasEnoughSignal(metrics));

    if (eligibleRuns.length === 0) {
        return null;
    }

    const ranked = [...eligibleRuns].sort((a, b) => performanceScore(b.metrics) - performanceScore(a.metrics));
    const winners = ranked.slice(0, Math.min(2, ranked.length));
    const winnerIds = new Set(winners.map((item) => `${item.run.createdAt}-${item.run.status}`));
    const losers = [...ranked]
        .reverse()
        .filter((item) => !winnerIds.has(`${item.run.createdAt}-${item.run.status}`))
        .slice(0, Math.min(2, Math.max(ranked.length - winners.length, 0)));

    const winnerThemeCounts = buildThemeLeaderboard(winners.map((item) => item.run));
    const loserThemeCounts = buildThemeLeaderboard(losers.map((item) => item.run));

    const winningThemes = THEME_DEFINITIONS
        .map((theme) => ({
            label: theme.label,
            delta: (winnerThemeCounts.get(theme.key) || 0) - (loserThemeCounts.get(theme.key) || 0),
            winnerCount: winnerThemeCounts.get(theme.key) || 0,
        }))
        .filter((item) => item.winnerCount > 0 && item.delta >= 0)
        .sort((a, b) => b.delta - a.delta || b.winnerCount - a.winnerCount)
        .slice(0, 3)
        .map((item) => item.label);

    const cautionThemes = THEME_DEFINITIONS
        .map((theme) => ({
            label: theme.label,
            delta: (loserThemeCounts.get(theme.key) || 0) - (winnerThemeCounts.get(theme.key) || 0),
            loserCount: loserThemeCounts.get(theme.key) || 0,
        }))
        .filter((item) => item.loserCount > 0 && item.delta > 0)
        .sort((a, b) => b.delta - a.delta || b.loserCount - a.loserCount)
        .slice(0, 3)
        .map((item) => item.label);

    const topPerformerSummaries = winners.map(({ run, metrics }) => summarizeRun(run, metrics));
    const underperformerSummaries = losers.map(({ run, metrics }) => summarizeRun(run, metrics));

    const lines: string[] = [
        "Use these learnings from prior live ad runs. Reuse the underlying angles, but do not repeat exact copy.",
    ];

    if (winningThemes.length > 0) {
        lines.push(`Winning themes to lean into: ${winningThemes.join("; ")}.`);
    }

    if (cautionThemes.length > 0) {
        lines.push(`Themes to treat cautiously: ${cautionThemes.join("; ")}.`);
    }

    if (topPerformerSummaries.length > 0) {
        lines.push("Best-performing runs:");
        topPerformerSummaries.forEach((summary) => lines.push(`- ${summary}`));
    }

    if (underperformerSummaries.length > 0) {
        lines.push("Underperforming runs:");
        underperformerSummaries.forEach((summary) => lines.push(`- ${summary}`));
    }

    return {
        testedRuns: eligibleRuns.length,
        winningThemes,
        cautionThemes,
        topPerformerSummaries,
        underperformerSummaries,
        promptText: lines.join("\n"),
    };
}
