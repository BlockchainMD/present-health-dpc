const fs = require("fs");
const path = require("path");
const net = require("net");
const { spawn, execFileSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

let prisma = null;
let proxyProcess = null;
let stoppingProxy = false;

const DEFAULT_TARGET = "prod";
const DEFAULT_PROXY_PORT = 5435;
const DEFAULT_CLOUD_RUN_SERVICE = "present-health-dpc";
const DEFAULT_CLOUD_RUN_REGION = "us-central1";
const DEFAULT_CLOUDSQL_INSTANCE = "present-health-dpc-2025:us-central1:present-health-db";

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

const DEFAULT_NEGATIVE_KEYWORDS = [
    "job",
    "vacancy",
    "career",
    "salary",
    "hiring",
    "internship",
    "free",
    "cheap",
    "discount",
    "coupon",
    "amazon",
    "facebook",
    "google",
    "yelp",
    "science",
    "research",
    "study",
    "university",
    "college",
];

const DENYLIST = [
    "prescription",
    "rx",
    "medication",
    "pharmacy",
    "ozempic",
    "wegovy",
    "cure",
    "guarantee",
    "24/7",
];

function usage() {
    console.log(`
Campaign CLI

Usage:
  node scripts/campaign-cli.js queue-review --slug <slug> --persona "<persona>" --intent "<intent>" [options]

Required:
  --slug                 Unique campaign slug
  --persona              Audience segment
  --intent               Search intent / pain point

Optional:
  --landing-slug         Defaults to --slug
  --seed-keywords        Comma list
  --benefits             Comma list
  --proof-points         Comma list
  --disclaimers          Comma list
  --budget-daily         Number (default: 50)
  --target-cpa           Number (default: 30)
  --geo                  Default: US
  --geo-states           Comma list of 2-letter codes (default: active 15 states)
  --tone                 Default: Empathetic & Professional
  --target               prod | local (default: prod)
  --service              Cloud Run service name for prod config lookup (default: present-health-dpc)
  --region               Cloud Run region for prod config lookup (default: us-central1)
  --cloudsql-instance    Cloud SQL instance connection name override
  --prod-db-url          Production DB URL override (or set PROD_DATABASE_URL)
  --proxy-port           Cloud SQL proxy local port (default: 5435)
  --dry-run              Validate + print payload only

Examples:
  node scripts/campaign-cli.js queue-review \\
    --slug messaging-first-primary-care-49 \\
    --persona "Busy adults in telehealth-enabled states" \\
    --intent "Need fast primary care access without waiting weeks"
`.trim());
}

function normalizeSlug(value) {
    return String(value || "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function clampText(value, maxLen) {
    return String(value || "").trim().slice(0, maxLen);
}

function toTitleCase(value) {
    return String(value || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}

function parseArgs(argv) {
    const out = { command: "help", flags: {} };
    const cmd = (argv[0] || "help").trim();
    out.command = cmd;
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

function getRequired(flags, key) {
    const value = flags[key];
    if (typeof value !== "string" || !value.trim()) {
        throw new Error(`Missing required --${key}`);
    }
    return value.trim();
}

function toList(value, fallback) {
    if (typeof value !== "string") return fallback;
    const items = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    return items.length ? items : fallback;
}

function toFloat(value, fallback) {
    if (typeof value !== "string") return fallback;
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : fallback;
}

function containsDeniedTerm(text) {
    const haystack = String(text || "").toLowerCase();
    return DENYLIST.find((term) => haystack.includes(term.toLowerCase())) || null;
}

function validateCampaignInput(payload) {
    const violations = [];
    const fields = [
        ...(payload.seedKeywords || []),
        ...(payload.benefits || []),
        ...(payload.proofPoints || []),
        payload.intent || "",
    ];

    for (const field of fields) {
        const denied = containsDeniedTerm(field);
        if (denied) {
            violations.push(`Contains blocked term "${denied}" in: ${field}`);
        }
    }

    return violations;
}

function resolveTarget(flags) {
    const raw = typeof flags.target === "string" ? flags.target.trim().toLowerCase() : DEFAULT_TARGET;
    const target = raw || DEFAULT_TARGET;
    if (target !== "prod" && target !== "local") {
        throw new Error(`Invalid --target "${target}". Use "prod" or "local".`);
    }
    return target;
}

function resolveProxyBinary() {
    const fromEnv = process.env.CLOUD_SQL_PROXY_BIN;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

    const local = path.join(process.cwd(), "cloud-sql-proxy");
    if (fs.existsSync(local)) return local;

    return "cloud-sql-proxy";
}

function getCloudRunDatabaseConfig(service, region) {
    let raw;
    try {
        raw = execFileSync(
            "gcloud",
            [
                "run",
                "services",
                "describe",
                service,
                "--platform=managed",
                "--region",
                region,
                "--format=json",
            ],
            { encoding: "utf8" }
        );
    } catch (error) {
        throw new Error(
            `Failed to read Cloud Run service config via gcloud (${service} in ${region}). ` +
            `Ensure gcloud is authenticated and configured.`
        );
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error("Failed to parse Cloud Run service JSON output.");
    }

    const envVars = parsed?.spec?.template?.spec?.containers?.[0]?.env || [];
    const databaseUrl = envVars.find((entry) => entry?.name === "DATABASE_URL" && typeof entry?.value === "string")?.value || "";
    const annotations = parsed?.spec?.template?.metadata?.annotations || {};
    const cloudSqlAnnotation = typeof annotations["run.googleapis.com/cloudsql-instances"] === "string"
        ? annotations["run.googleapis.com/cloudsql-instances"]
        : "";
    const cloudSqlInstance = cloudSqlAnnotation.split(",").map((x) => x.trim()).filter(Boolean)[0] || "";

    return { databaseUrl, cloudSqlInstance };
}

function parseCloudSqlInstanceFromDatabaseUrl(databaseUrl) {
    try {
        const parsed = new URL(databaseUrl);
        const hostParam = parsed.searchParams.get("host");
        if (typeof hostParam === "string" && hostParam.startsWith("/cloudsql/")) {
            return hostParam.replace("/cloudsql/", "").trim();
        }
    } catch {
        return "";
    }
    return "";
}

function toTcpDatabaseUrl(databaseUrl, proxyPort) {
    let parsed;
    try {
        parsed = new URL(databaseUrl);
    } catch {
        throw new Error("Invalid production database URL.");
    }

    const dbName = parsed.pathname.replace(/^\//, "");
    if (!dbName) {
        throw new Error("Production database URL is missing database name.");
    }

    const username = encodeURIComponent(decodeURIComponent(parsed.username || ""));
    const passwordRaw = parsed.password ? decodeURIComponent(parsed.password) : "";
    const password = passwordRaw ? `:${encodeURIComponent(passwordRaw)}` : "";
    const auth = username ? `${username}${password}` : "";

    const query = new URLSearchParams(parsed.search);
    query.delete("host");
    const queryString = query.toString();

    return `postgresql://${auth}@127.0.0.1:${proxyPort}/${dbName}${queryString ? `?${queryString}` : ""}`;
}

function checkPortOpen(port) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: "127.0.0.1", port });
        socket.once("connect", () => {
            socket.destroy();
            resolve(true);
        });
        socket.once("error", () => resolve(false));
    });
}

async function resolveProxyPort(flags) {
    const explicit = typeof flags["proxy-port"] === "string" && flags["proxy-port"].trim();
    const requested = Math.trunc(toFloat(flags["proxy-port"], DEFAULT_PROXY_PORT));

    if (explicit) {
        const open = await checkPortOpen(requested);
        if (open) {
            throw new Error(`Requested --proxy-port ${requested} is already in use.`);
        }
        return requested;
    }

    for (let port = requested; port < requested + 50; port += 1) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await checkPortOpen(port))) return port;
    }

    throw new Error(`Could not find an available local proxy port in ${requested}-${requested + 49}.`);
}

async function waitForPort(port, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await checkPortOpen(port);
        if (ok) return;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    throw new Error(`Cloud SQL proxy did not become ready on port ${port}.`);
}

async function startCloudSqlProxy(instance, port) {
    const binary = resolveProxyBinary();
    stoppingProxy = false;
    proxyProcess = spawn(binary, ["--address", "127.0.0.1", "--port", String(port), instance], {
        stdio: "ignore",
        detached: false,
    });

    proxyProcess.once("exit", (code) => {
        if (stoppingProxy) return;
        if (code && code !== 0) {
            console.error(`cloud-sql-proxy exited unexpectedly with code ${code}`);
        }
    });

    await waitForPort(port);
}

async function stopCloudSqlProxy() {
    if (!proxyProcess) return;
    stoppingProxy = true;
    proxyProcess.kill("SIGTERM");
    proxyProcess = null;
}

async function configureDatabaseTarget(flags) {
    const target = resolveTarget(flags);
    if (target === "local") {
        console.log("Database target: local");
        return;
    }

    const proxyPort = await resolveProxyPort(flags);
    const service = typeof flags.service === "string" && flags.service.trim()
        ? flags.service.trim()
        : (process.env.PROD_CLOUD_RUN_SERVICE || DEFAULT_CLOUD_RUN_SERVICE);
    const region = typeof flags.region === "string" && flags.region.trim()
        ? flags.region.trim()
        : (process.env.PROD_CLOUD_RUN_REGION || DEFAULT_CLOUD_RUN_REGION);
    const overrideDbUrl = typeof flags["prod-db-url"] === "string" && flags["prod-db-url"].trim()
        ? flags["prod-db-url"].trim()
        : (process.env.PROD_DATABASE_URL || "").trim();
    const overrideInstance = typeof flags["cloudsql-instance"] === "string" && flags["cloudsql-instance"].trim()
        ? flags["cloudsql-instance"].trim()
        : "";

    let databaseUrl = overrideDbUrl;
    let cloudSqlInstance = overrideInstance;

    if (!databaseUrl) {
        const fromService = getCloudRunDatabaseConfig(service, region);
        databaseUrl = fromService.databaseUrl;
        if (!cloudSqlInstance) cloudSqlInstance = fromService.cloudSqlInstance;
    }

    if (!databaseUrl) {
        throw new Error(
            "Could not resolve production DATABASE_URL. " +
            "Provide --prod-db-url or set PROD_DATABASE_URL."
        );
    }

    if (!cloudSqlInstance) {
        cloudSqlInstance = parseCloudSqlInstanceFromDatabaseUrl(databaseUrl);
    }
    if (!cloudSqlInstance) {
        cloudSqlInstance = DEFAULT_CLOUDSQL_INSTANCE;
    }

    await startCloudSqlProxy(cloudSqlInstance, proxyPort);
    process.env.DATABASE_URL = toTcpDatabaseUrl(databaseUrl, proxyPort);
    console.log(`Database target: production (${service}/${region}) via ${cloudSqlInstance} on :${proxyPort}`);
}

function buildAdPlan(campaign) {
    const personaShort = clampText(campaign.persona, 26);
    const intentShort = clampText(campaign.intent, 28);

    const headlinesRaw = [
        "Present Health DPC",
        "$49/Month Membership",
        "Messaging-First Care",
        "Start Membership",
        "No Waiting Rooms",
        "Message Your Care Team",
        personaShort ? `Care for ${personaShort}` : "",
        intentShort,
    ];

    const headlines = Array.from(
        new Set(
            headlinesRaw
                .map((h) => clampText(h, 30))
                .filter(Boolean)
        )
    ).slice(0, 15);

    const descriptionsRaw = [
        "Message your care team directly and get full-service primary care for $49/month.",
        "Simple, transparent monthly membership. No insurance hassles, no waiting rooms.",
        "Adults 18+ in active states. Telehealth-first care with physician oversight.",
        "One plan. Everything included. Start in minutes and stay in control of your care.",
    ];
    const descriptions = Array.from(
        new Set(descriptionsRaw.map((d) => clampText(d, 90)).filter(Boolean))
    ).slice(0, 4);

    const keywords = (campaign.seedKeywords || [])
        .map((kw) => clampText(kw, 80))
        .filter(Boolean)
        .map((text) => ({ text, matchType: "PHRASE" }));

    return {
        campaignId: campaign.id,
        rsa: { headlines, descriptions },
        keywords,
        negativeKeywords: DEFAULT_NEGATIVE_KEYWORDS,
        finalUrl: `https://presenthealthmd.com/lp/${campaign.landingSlug}`,
        meta: {
            primaryText: descriptions[0] || "",
            headline: headlines[0] || "Present Health DPC",
            description: descriptions[1] || "",
        },
    };
}

function buildLandingPageSpec(campaign) {
    return {
        hero: {
            headline: "Text your care team. Get a real answer.",
            subheadline:
                "Full-service primary care, starting with a message. Sick visits, chronic care, prescriptions, labs, and more — $49/month.",
            cta: "Start Membership - $49/mo",
        },
        educationalBriefing: undefined,
        pricing: {
            headline: "One plan. Everything included.",
            subheadline: "$49/month or $490/year. No tiers. No per-visit fees.",
            tiers: [
                {
                    name: "Membership",
                    price: 49,
                    period: "mo",
                    features: [
                        "Unlimited secure messaging",
                        "Video when clinically appropriate",
                        "Chronic care and medication management",
                        "Lab ordering and interpretation",
                    ],
                },
            ],
        },
        benefits: campaign.benefits,
        howItWorks: [
            { title: "Sign up", desc: "Start membership in minutes." },
            { title: "Start messaging", desc: "Message your care team for real primary care needs." },
            { title: "Get care", desc: "Prescriptions, labs, chronic care, and care coordination in one thread." },
        ],
        proof: campaign.proofPoints,
        faqs: [
            {
                question: "Is this insurance?",
                answer: "No. Present Health is a Direct Primary Care membership and does not bill insurance.",
            },
            {
                question: "What does it cost?",
                answer: "Membership is $49/month or $490/year.",
            },
            {
                question: "Who is this for?",
                answer: "Adults 18+ in active states where Present Health is available.",
            },
        ],
        ctaSection: {
            headline: "Primary care that actually works.",
            subheadline: "One clear price. Messaging-first access.",
            buttonText: "Start Membership - $49/mo",
        },
    };
}

async function queueReview(flags) {
    const slug = normalizeSlug(getRequired(flags, "slug"));
    const persona = getRequired(flags, "persona");
    const intent = getRequired(flags, "intent");
    const landingSlug = normalizeSlug(
        (typeof flags["landing-slug"] === "string" ? flags["landing-slug"] : slug) || slug
    );
    const seedKeywords = toList(flags["seed-keywords"], [
        "virtual primary care",
        "telehealth primary care",
        "direct primary care membership",
    ]);
    const benefits = toList(flags["benefits"], [
        "Messaging-first access for routine and ongoing primary care",
        "One transparent $49 monthly plan",
        "No per-visit fees or surprise billing",
        "Care delivered by licensed clinicians with physician oversight",
    ]);
    const proofPoints = toList(flags["proof-points"], [
        "Adults 18+",
        "Available in 15 states",
        "Transparent pricing",
    ]);
    const disclaimers = toList(flags["disclaimers"], [
        "Not insurance",
        "Does not replace emergency care",
        "Available in select states",
    ]);
    const budgetDaily = toFloat(flags["budget-daily"], 50);
    const targetCpa = toFloat(flags["target-cpa"], 30);
    const geo = typeof flags.geo === "string" && flags.geo.trim() ? flags.geo.trim().toUpperCase() : "US";
    const geoStates = toList(flags["geo-states"], DEFAULT_GEO_STATES).map((x) => x.toUpperCase());
    const tone = typeof flags.tone === "string" && flags.tone.trim() ? flags.tone.trim() : "Empathetic & Professional";
    const dryRun = flags["dry-run"] === true;

    const candidate = {
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
    };

    const violations = validateCampaignInput(candidate);
    if (violations.length) {
        throw new Error(`Compliance check failed:\n- ${violations.join("\n- ")}`);
    }

    const existing = await prisma.campaign.findUnique({ where: { slug } });
    if (existing) {
        throw new Error(`Campaign slug already exists: ${slug}`);
    }

    if (dryRun) {
        console.log(JSON.stringify(candidate, null, 2));
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

    const adPlan = buildAdPlan(campaign);
    const landingPageSpec = buildLandingPageSpec(campaign);
    const nowIso = new Date().toISOString();
    const artifacts = {
        AD_PLAN: {
            data: adPlan,
            timestamp: nowIso,
            version: 1,
        },
        LANDING_PAGE_SPEC: {
            data: landingPageSpec,
            timestamp: nowIso,
            version: 1,
        },
    };

    const run = await prisma.campaignRun.create({
        data: {
            campaignId: campaign.id,
            status: "READY_FOR_REVIEW",
            landingPageContent: JSON.stringify(landingPageSpec),
            chosenKeywords: adPlan.keywords.map((k) => k.text),
            matchTypes: adPlan.keywords.map((k) => k.matchType),
            negativeKeywords: adPlan.negativeKeywords,
            rsaHeadlines: adPlan.rsa.headlines,
            rsaDescriptions: adPlan.rsa.descriptions,
            finalUrl: adPlan.finalUrl,
            artifacts,
        },
    });

    await prisma.generatedAsset.createMany({
        data: [
            {
                type: "AD_PLAN",
                status: "READY_FOR_REVIEW",
                campaignId: campaign.id,
                campaignRunId: run.id,
                promptVersion: "cli-1.0",
                input: {},
                output: adPlan,
                validation: {
                    ok: true,
                    errors: [],
                },
            },
            {
                type: "LANDING_PAGE_SPEC",
                status: "READY_FOR_REVIEW",
                campaignId: campaign.id,
                campaignRunId: run.id,
                promptVersion: "cli-1.0",
                input: {},
                output: landingPageSpec,
                validation: {
                    ok: true,
                    errors: [],
                },
            },
        ],
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

    const siteBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://presenthealthmd.com";
    const adminCampaignUrl = `${siteBase.replace(/\/+$/, "")}/admin/campaigns/${campaign.id}`;
    const adminApproveUrl = `${siteBase.replace(/\/+$/, "")}/admin/campaigns/${campaign.id}`;
    const adCount = adPlan.rsa.headlines.length + adPlan.rsa.descriptions.length;

    console.log(`
Queued campaign for review:
- Campaign ID: ${campaign.id}
- Campaign Slug: ${campaign.slug}
- Campaign Status: READY
- Campaign Run ID: ${run.id}
- Campaign Run Status: READY_FOR_REVIEW
- Assets Created: AD_PLAN + LANDING_PAGE_SPEC (${adCount} ad components)
- Landing Page URL: ${adPlan.finalUrl}
- Review in Admin: ${adminCampaignUrl}
- Final accept path: Approve Ad Plan -> Go Live in ${adminApproveUrl}
`.trim());
}

async function main() {
    const { command, flags } = parseArgs(process.argv.slice(2));
    if (command !== "queue-review") {
        usage();
        process.exit(0);
    }

    await configureDatabaseTarget(flags);
    prisma = new PrismaClient();
    await queueReview(flags);
}

main()
    .catch((error) => {
        console.error(error && error.message ? error.message : String(error));
        process.exit(1);
    })
    .finally(async () => {
        try {
            if (prisma) {
                await prisma.$disconnect();
            }
        } finally {
            await stopCloudSqlProxy();
        }
    });
