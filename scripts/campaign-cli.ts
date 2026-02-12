import { prisma } from "../lib/prisma";
import { validateCampaignSpec } from "../lib/ads/compliance";
import { generateLandingPageSpec } from "../lib/ads/generator";
import { generateAdPlan } from "../lib/ads/google-ads";
import { PipelineManager } from "../lib/ads/pipeline";

type Command = "queue-review" | "help";

type CliFlags = Record<string, string | boolean>;

const DEFAULT_GEO_STATES = [
    "AZ",
    "FL",
    "IN",
    "KY",
    "MI",
    "MN",
    "NC",
    "NE",
    "NH",
    "OH",
    "RI",
    "TX",
    "UT",
    "WA",
    "WI",
];

function usage() {
    console.log(`
Campaign CLI

Usage:
  npx tsx scripts/campaign-cli.ts queue-review --slug <slug> --persona "<persona>" --intent "<intent>" [options]

Required:
  --slug                 Unique campaign slug
  --persona              Audience segment
  --intent               Search intent / pain point

Optional:
  --landing-slug         Defaults to --slug
  --seed-keywords        Comma list (default: virtual primary care, telehealth doctor, direct primary care)
  --benefits             Comma list
  --proof-points         Comma list
  --disclaimers          Comma list
  --budget-daily         Number (default: 50)
  --target-cpa           Number (default: 30)
  --geo                  Default: US
  --geo-states           Comma list of 2-letter codes (default: active 15 states)
  --tone                 Default: Empathetic & Professional
  --dry-run              Validate + print payload only

Examples:
  npx tsx scripts/campaign-cli.ts queue-review \\
    --slug messaging-first-primary-care-49 \\
    --persona "Busy adults in telehealth-enabled states" \\
    --intent "Need fast primary care access without waiting weeks"

  npx tsx scripts/campaign-cli.ts queue-review \\
    --slug hsa-friendly-primary-care-2026 \\
    --persona "Adults comparing DPC vs insurance copays" \\
    --intent "Looking for transparent $49/month primary care" \\
    --seed-keywords "direct primary care,virtual primary care,messaging first primary care"
`.trim());
}

function toList(value: string | boolean | undefined, fallback: string[]) {
    if (typeof value !== "string") return fallback;
    const items = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    return items.length ? items : fallback;
}

function parseFloatFlag(value: string | boolean | undefined, fallback: number) {
    if (typeof value !== "string") return fallback;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeSlug(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function parseArgs(argv: string[]) {
    const out: { command: Command; flags: CliFlags } = { command: "help", flags: {} };
    const commandRaw = (argv[0] || "help").trim();
    out.command = commandRaw === "queue-review" ? "queue-review" : "help";

    for (let i = 1; i < argv.length; i += 1) {
        const token = argv[i];
        if (!token.startsWith("--")) continue;
        const key = token.slice(2);
        const next = argv[i + 1];
        if (!next || next.startsWith("--")) {
            out.flags[key] = true;
            continue;
        }
        out.flags[key] = next;
        i += 1;
    }

    return out;
}

function getRequiredString(flags: CliFlags, name: string) {
    const value = flags[name];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`Missing required --${name}`);
    }
    return value.trim();
}

async function queueReview(flags: CliFlags) {
    const slug = normalizeSlug(getRequiredString(flags, "slug"));
    const persona = getRequiredString(flags, "persona");
    const intent = getRequiredString(flags, "intent");
    const landingSlug = normalizeSlug(
        (typeof flags["landing-slug"] === "string" ? flags["landing-slug"] : slug) || slug
    );

    const seedKeywords = toList(flags["seed-keywords"], [
        "virtual primary care",
        "telehealth doctor",
        "direct primary care",
    ]);
    const benefits = toList(flags["benefits"], [
        "Messaging-first access with video when clinically appropriate",
        "One transparent price: $49/month",
        "No per-visit fees or surprise billing",
        "Care delivered by licensed clinicians with board-certified physician oversight",
    ]);
    const proofPoints = toList(flags["proof-points"], [
        "Adults 18+",
        "Available in 15 states",
        "Transparent membership pricing",
    ]);
    const disclaimers = toList(flags["disclaimers"], [
        "Not insurance",
        "Does not replace emergency care",
        "Available in select states",
    ]);
    const geo = typeof flags.geo === "string" && flags.geo.trim() ? flags.geo.trim().toUpperCase() : "US";
    const geoStates = toList(flags["geo-states"], DEFAULT_GEO_STATES).map((x) => x.toUpperCase());
    const tone = typeof flags.tone === "string" && flags.tone.trim() ? flags.tone.trim() : "Empathetic & Professional";
    const budgetDaily = parseFloatFlag(flags["budget-daily"], 50);
    const targetCpa = parseFloatFlag(flags["target-cpa"], 30);
    const dryRun = flags["dry-run"] === true;

    const campaignSpec = {
        slug,
        persona,
        intent,
        seedKeywords,
        strategy: "TRANSACTIONAL" as const,
        layoutType: "CONVERSION" as const,
        benefits,
        proofPoints,
        disclaimers,
        budgetDaily,
        targetCpa,
        geo,
        tone,
    };

    const compliance = validateCampaignSpec(campaignSpec);
    if (compliance.status === "FAIL") {
        throw new Error(`Compliance check failed:\n- ${compliance.reasons.join("\n- ")}`);
    }

    const existing = await prisma.campaign.findUnique({ where: { slug } });
    if (existing) {
        throw new Error(`Campaign slug already exists: ${slug}`);
    }

    if (dryRun) {
        console.log(JSON.stringify({ campaign: campaignSpec, landingSlug, geoStates }, null, 2));
        return;
    }

    const campaign = await prisma.campaign.create({
        data: {
            slug,
            persona,
            intent,
            seedKeywords,
            benefits,
            proofPoints,
            disclaimers,
            landingSlug,
            budgetDaily,
            targetCpa,
            geo,
            geoStates,
            tone,
            status: "DRAFT",
            strategy: "TRANSACTIONAL",
            layoutType: "CONVERSION",
        },
    });

    const run = await prisma.campaignRun.create({
        data: {
            campaignId: campaign.id,
            status: "DRAFT",
        },
    });

    const lpSpec = await generateLandingPageSpec(campaign.id);
    const adPlan = generateAdPlan(campaign as any);

    await PipelineManager.saveArtifact(run.id, "LANDING_PAGE_SPEC", lpSpec);
    await PipelineManager.saveArtifact(run.id, "AD_PLAN", adPlan);

    await prisma.campaignRun.update({
        where: { id: run.id },
        data: {
            landingPageContent: JSON.stringify(lpSpec),
            chosenKeywords: adPlan.keywords.map((k) => k.text),
            matchTypes: adPlan.keywords.map((k) => k.matchType),
            negativeKeywords: adPlan.negativeKeywords || [],
            rsaHeadlines: adPlan.rsa.headlines,
            rsaDescriptions: adPlan.rsa.descriptions,
            finalUrl: adPlan.finalUrl || `https://presenthealthmd.com/lp/${landingSlug}`,
            status: "READY_FOR_REVIEW",
        },
    });

    await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "READY" },
    });

    await prisma.auditLog.create({
        data: {
            actorUserId: null,
            action: "CLI_QUEUE_REVIEW",
            entityType: "CampaignRun",
            entityId: run.id,
            metadata: {
                campaignId: campaign.id,
                campaignSlug: campaign.slug,
                source: "CLI",
                queuedForReview: true,
            },
        },
    });

    const adPlanAsset = await prisma.generatedAsset.findFirst({
        where: { campaignRunId: run.id, type: "AD_PLAN" },
        select: { id: true, status: true },
    });

    console.log(`Queued campaign for review:
- Campaign ID: ${campaign.id}
- Campaign Slug: ${campaign.slug}
- Run ID: ${run.id}
- Campaign Status: READY
- Run Status: READY_FOR_REVIEW
- AD_PLAN Asset: ${adPlanAsset?.id || "not found"} (${adPlanAsset?.status || "n/a"})
- Admin URL: /admin/campaigns/${campaign.id}
`);
}

async function main() {
    const { command, flags } = parseArgs(process.argv.slice(2));
    if (command === "help") {
        usage();
        process.exit(0);
    }

    if (command === "queue-review") {
        await queueReview(flags);
        process.exit(0);
    }

    usage();
    process.exit(1);
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

