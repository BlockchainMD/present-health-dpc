import { CitationCategory, CitationStatus } from "@prisma/client";
import type { CitationDirectory } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { US_STATES } from "@/lib/us-states";
import { fsmbStateMedicalBoardUrl } from "@/lib/verification-links";

const CANONICAL_NAP_KEY = "citation:canonical_nap";
const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_ENTITY_SPINE_TEXT =
    "Present Health is a messaging-first primary care practice for adults 18+. Members message licensed clinicians for sick visits, chronic care, prescriptions, labs, triage, and care navigation, with video when clinically appropriate. Care is delivered by licensed clinicians and overseen by a board-certified physician. One plan: $49/month. Everything included.";

export type CanonicalNapSettings = {
    businessName: string;
    address: string;
    phone: string;
    websiteUrl: string;
    entityDescription: string;
    updatedAt?: string;
};

export type CitationAuditMismatch = {
    field: "nameAsListed" | "addressAsListed" | "phoneAsListed" | "websiteAsListed";
    expected: string;
    actual: string;
};

export type CitationAuditRecord = {
    citation: CitationDirectory;
    mismatches: CitationAuditMismatch[];
    mismatchFields: CitationAuditMismatch["field"][];
    needsUpdate: boolean;
    shouldCreate: boolean;
    isOverdue: boolean;
    daysUntilReverify: number | null;
};

export type CitationAuditSummary = {
    total: number;
    active: number;
    pending: number;
    needsUpdate: number;
    notListed: number;
    overdue: number;
    mismatched: number;
};

export type CitationAuditPayload = {
    canonical: CanonicalNapSettings;
    citations: CitationDirectory[];
    records: CitationAuditRecord[];
    summary: CitationAuditSummary;
};

type CitationSeed = {
    platformName: string;
    platformUrl: string;
    category: CitationCategory;
};

const BASE_CITATION_SEEDS: CitationSeed[] = [
    // Clinical
    { platformName: "NPI/NPPES Registry", platformUrl: "https://npiregistry.cms.hhs.gov/", category: CitationCategory.CLINICAL },
    { platformName: "ABFM Verification", platformUrl: "https://portfolio.theabfm.org/diplomate/verify.aspx", category: CitationCategory.CLINICAL },
    { platformName: "Healthgrades", platformUrl: "https://www.healthgrades.com/", category: CitationCategory.CLINICAL },
    { platformName: "Zocdoc", platformUrl: "https://www.zocdoc.com/", category: CitationCategory.CLINICAL },
    { platformName: "Vitals", platformUrl: "https://www.vitals.com/", category: CitationCategory.CLINICAL },
    {
        platformName: "WebMD Physician Directory",
        platformUrl: "https://doctor.webmd.com/",
        category: CitationCategory.CLINICAL,
    },
    { platformName: "Doximity", platformUrl: "https://www.doximity.com/", category: CitationCategory.CLINICAL },
    { platformName: "DPC Alliance Directory", platformUrl: "https://dpcalliance.org/", category: CitationCategory.CLINICAL },
    { platformName: "DPC Frontier Mapper", platformUrl: "https://mapper.dpcfrontier.com/", category: CitationCategory.CLINICAL },

    // Brand/Social
    { platformName: "LinkedIn (personal)", platformUrl: "https://www.linkedin.com/", category: CitationCategory.BRAND },
    { platformName: "LinkedIn (company)", platformUrl: "https://www.linkedin.com/company/", category: CitationCategory.BRAND },
    { platformName: "YouTube", platformUrl: "https://www.youtube.com/", category: CitationCategory.BRAND },
    { platformName: "X (Twitter)", platformUrl: "https://x.com/", category: CitationCategory.BRAND },
    { platformName: "Facebook", platformUrl: "https://www.facebook.com/", category: CitationCategory.BRAND },
    { platformName: "Instagram", platformUrl: "https://www.instagram.com/", category: CitationCategory.BRAND },
    { platformName: "TikTok", platformUrl: "https://www.tiktok.com/", category: CitationCategory.BRAND },
    { platformName: "Crunchbase", platformUrl: "https://www.crunchbase.com/", category: CitationCategory.BRAND },

    // Business
    { platformName: "Yelp", platformUrl: "https://www.yelp.com/", category: CitationCategory.BUSINESS },
    { platformName: "BBB", platformUrl: "https://www.bbb.org/", category: CitationCategory.BUSINESS },
    {
        platformName: "Local Chamber of Commerce",
        platformUrl: "https://www.chamberofcommerce.com/",
        category: CitationCategory.BUSINESS,
    },
    { platformName: "Apple Maps", platformUrl: "https://mapsconnect.apple.com/", category: CitationCategory.BUSINESS },
    { platformName: "Bing Places", platformUrl: "https://www.bingplaces.com/", category: CitationCategory.BUSINESS },
];

function normalizeWhitespace(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function normalizeString(value: string) {
    return normalizeWhitespace(value).toLowerCase();
}

function normalizePhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
    return digits;
}

function normalizeUrl(value: string) {
    const raw = value.trim();
    if (!raw) return "";
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
        const parsed = new URL(withProtocol);
        const pathname = parsed.pathname.replace(/\/$/, "");
        return `${parsed.hostname.toLowerCase()}${pathname}`;
    } catch {
        return raw.toLowerCase().replace(/\/$/, "");
    }
}

function asOptionalString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = normalizeWhitespace(value);
    return trimmed ? trimmed : null;
}

function asOptionalNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number.parseInt(value.trim(), 10);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function buildDefaultCanonicalNapSettings(): CanonicalNapSettings {
    const websiteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "https://presenthealthmd.com";

    return {
        businessName: "Present Health",
        address: "",
        phone: "",
        websiteUrl,
        entityDescription: DEFAULT_ENTITY_SPINE_TEXT,
    };
}

function parseCanonicalNapValue(value: unknown): CanonicalNapSettings {
    const defaults = buildDefaultCanonicalNapSettings();
    if (!value || typeof value !== "object") return defaults;

    const obj = value as Record<string, unknown>;

    return {
        businessName:
            (typeof obj.businessName === "string" && normalizeWhitespace(obj.businessName)) || defaults.businessName,
        address: (typeof obj.address === "string" && normalizeWhitespace(obj.address)) || defaults.address,
        phone: (typeof obj.phone === "string" && normalizeWhitespace(obj.phone)) || defaults.phone,
        websiteUrl:
            (typeof obj.websiteUrl === "string" && normalizeWhitespace(obj.websiteUrl)) || defaults.websiteUrl,
        entityDescription:
            (typeof obj.entityDescription === "string" && normalizeWhitespace(obj.entityDescription)) ||
            defaults.entityDescription,
        updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : undefined,
    };
}

export async function getCanonicalNapSettings(): Promise<CanonicalNapSettings> {
    try {
        const row = await prisma.contentStrategy.findUnique({ where: { key: CANONICAL_NAP_KEY } });
        return parseCanonicalNapValue(row?.value);
    } catch (error) {
        console.error("[citations] Failed to load canonical NAP settings", error);
        return buildDefaultCanonicalNapSettings();
    }
}

export async function upsertCanonicalNapSettings(
    patch: Partial<CanonicalNapSettings>
): Promise<CanonicalNapSettings> {
    const current = await getCanonicalNapSettings();

    const next: CanonicalNapSettings = {
        businessName: asOptionalString(patch.businessName) ?? current.businessName,
        address: typeof patch.address === "string" ? normalizeWhitespace(patch.address) : current.address,
        phone: typeof patch.phone === "string" ? normalizeWhitespace(patch.phone) : current.phone,
        websiteUrl: asOptionalString(patch.websiteUrl) ?? current.websiteUrl,
        entityDescription: asOptionalString(patch.entityDescription) ?? current.entityDescription,
        updatedAt: new Date().toISOString(),
    };

    await prisma.contentStrategy.upsert({
        where: { key: CANONICAL_NAP_KEY },
        update: { value: next as any },
        create: { key: CANONICAL_NAP_KEY, value: next as any },
    });

    return next;
}

async function resolveSeedStateNames(limit = 15): Promise<string[]> {
    const names: string[] = [];

    const activeStates = await prisma.state.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: "asc" },
        take: limit,
    });

    for (const row of activeStates) {
        const name = normalizeWhitespace(row.name || "");
        if (name && !names.includes(name)) names.push(name);
    }

    if (names.length < limit) {
        const allStates = await prisma.state.findMany({
            select: { name: true },
            orderBy: { name: "asc" },
            take: 100,
        });
        for (const row of allStates) {
            const name = normalizeWhitespace(row.name || "");
            if (!name || names.includes(name)) continue;
            names.push(name);
            if (names.length >= limit) break;
        }
    }

    if (names.length < limit) {
        for (const state of US_STATES) {
            if (!names.includes(state.name)) {
                names.push(state.name);
                if (names.length >= limit) break;
            }
        }
    }

    return names.slice(0, limit);
}

async function buildStateMedicalBoardSeeds(): Promise<CitationSeed[]> {
    const stateNames = await resolveSeedStateNames(15);
    return stateNames.map((stateName) => ({
        platformName: `${stateName} Medical Board`,
        platformUrl: fsmbStateMedicalBoardUrl(stateName),
        category: CitationCategory.CLINICAL,
    }));
}

export async function ensureCitationDirectorySeeded() {
    const stateSeeds = await buildStateMedicalBoardSeeds();
    const seeds = [...BASE_CITATION_SEEDS, ...stateSeeds];

    await prisma.$transaction(
        seeds.map((seed) =>
            prisma.citationDirectory.upsert({
                where: { platformName: seed.platformName },
                update: {
                    category: seed.category,
                    platformUrl: seed.platformUrl,
                },
                create: {
                    platformName: seed.platformName,
                    platformUrl: seed.platformUrl,
                    category: seed.category,
                    status: CitationStatus.NOT_LISTED,
                    reminderIntervalDays: 90,
                },
            })
        )
    );

    return { seededCount: seeds.length };
}

function buildMismatches(citation: CitationDirectory, canonical: CanonicalNapSettings): CitationAuditMismatch[] {
    if (citation.status === CitationStatus.NOT_LISTED) {
        return [];
    }

    const mismatches: CitationAuditMismatch[] = [];

    const compareName = canonical.businessName.trim();
    if (compareName) {
        const actual = citation.nameAsListed || "";
        if (!actual || normalizeString(compareName) !== normalizeString(actual)) {
            mismatches.push({ field: "nameAsListed", expected: compareName, actual });
        }
    }

    const compareAddress = canonical.address.trim();
    if (compareAddress) {
        const actual = citation.addressAsListed || "";
        if (!actual || normalizeString(compareAddress) !== normalizeString(actual)) {
            mismatches.push({ field: "addressAsListed", expected: compareAddress, actual });
        }
    }

    const comparePhone = canonical.phone.trim();
    if (comparePhone) {
        const actual = citation.phoneAsListed || "";
        if (!actual || normalizePhone(comparePhone) !== normalizePhone(actual)) {
            mismatches.push({ field: "phoneAsListed", expected: comparePhone, actual });
        }
    }

    const compareWebsite = canonical.websiteUrl.trim();
    if (compareWebsite) {
        const actual = citation.websiteAsListed || "";
        if (!actual || normalizeUrl(compareWebsite) !== normalizeUrl(actual)) {
            mismatches.push({ field: "websiteAsListed", expected: compareWebsite, actual });
        }
    }

    return mismatches;
}

export function computeNextVerificationDate(base: Date, reminderIntervalDays: number) {
    return new Date(base.getTime() + Math.max(1, reminderIntervalDays) * DAY_MS);
}

export async function markCitationVerified(citationId: string) {
    const citation = await prisma.citationDirectory.findUnique({ where: { id: citationId } });
    if (!citation) return null;

    const now = new Date();
    const reminderIntervalDays = citation.reminderIntervalDays || 90;

    return prisma.citationDirectory.update({
        where: { id: citationId },
        data: {
            lastVerifiedDate: now,
            nextVerificationDate: computeNextVerificationDate(now, reminderIntervalDays),
            status: CitationStatus.ACTIVE,
        },
    });
}

export async function getCitationDirectoryRows() {
    return prisma.citationDirectory.findMany({
        orderBy: [{ category: "asc" }, { platformName: "asc" }],
    });
}

export async function createCitationDirectoryRow(payload: Record<string, unknown>) {
    const platformName = asOptionalString(payload.platformName) || "";
    if (!platformName) {
        throw new Error("platformName is required");
    }

    const categoryRaw = asOptionalString(payload.category) || "PRESS";
    if (!Object.values(CitationCategory).includes(categoryRaw as CitationCategory)) {
        throw new Error("Invalid category");
    }

    const statusRaw = asOptionalString(payload.status) || CitationStatus.NOT_LISTED;
    if (!Object.values(CitationStatus).includes(statusRaw as CitationStatus)) {
        throw new Error("Invalid status");
    }

    return prisma.citationDirectory.create({
        data: {
            platformName,
            platformUrl: asOptionalString(payload.platformUrl),
            listingUrl: asOptionalString(payload.listingUrl),
            category: categoryRaw as CitationCategory,
            nameAsListed: asOptionalString(payload.nameAsListed),
            addressAsListed: asOptionalString(payload.addressAsListed),
            phoneAsListed: asOptionalString(payload.phoneAsListed),
            websiteAsListed: asOptionalString(payload.websiteAsListed),
            status: statusRaw as CitationStatus,
            reminderIntervalDays: asOptionalNumber(payload.reminderIntervalDays) || 90,
            notes: asOptionalString(payload.notes),
        },
    });
}

export async function updateCitationDirectoryRow(id: string, payload: Record<string, unknown>) {
    const data: any = {};

    if (payload.platformName !== undefined) {
        const platformName = asOptionalString(payload.platformName);
        if (!platformName) {
            throw new Error("platformName cannot be empty");
        }
        data.platformName = platformName;
    }
    if (payload.platformUrl !== undefined) data.platformUrl = asOptionalString(payload.platformUrl);
    if (payload.listingUrl !== undefined) data.listingUrl = asOptionalString(payload.listingUrl);

    if (payload.category !== undefined) {
        const category = asOptionalString(payload.category);
        if (!category || !Object.values(CitationCategory).includes(category as CitationCategory)) {
            throw new Error("Invalid category");
        }
        data.category = category as CitationCategory;
    }

    if (payload.status !== undefined) {
        const status = asOptionalString(payload.status);
        if (!status || !Object.values(CitationStatus).includes(status as CitationStatus)) {
            throw new Error("Invalid status");
        }
        data.status = status as CitationStatus;
    }

    if (payload.nameAsListed !== undefined) data.nameAsListed = asOptionalString(payload.nameAsListed);
    if (payload.addressAsListed !== undefined) data.addressAsListed = asOptionalString(payload.addressAsListed);
    if (payload.phoneAsListed !== undefined) data.phoneAsListed = asOptionalString(payload.phoneAsListed);
    if (payload.websiteAsListed !== undefined) data.websiteAsListed = asOptionalString(payload.websiteAsListed);
    if (payload.notes !== undefined) data.notes = asOptionalString(payload.notes);

    if (payload.lastVerifiedDate !== undefined) {
        const raw = asOptionalString(payload.lastVerifiedDate);
        data.lastVerifiedDate = raw ? new Date(raw) : null;
    }

    if (payload.nextVerificationDate !== undefined) {
        const raw = asOptionalString(payload.nextVerificationDate);
        data.nextVerificationDate = raw ? new Date(raw) : null;
    }

    if (payload.reminderIntervalDays !== undefined) {
        const reminderIntervalDays = asOptionalNumber(payload.reminderIntervalDays);
        if (reminderIntervalDays === null || reminderIntervalDays < 1 || reminderIntervalDays > 3650) {
            throw new Error("reminderIntervalDays must be between 1 and 3650");
        }
        data.reminderIntervalDays = reminderIntervalDays;

        if (payload.recalculateNextVerificationDate === true) {
            const base = (payload.lastVerifiedDate
                ? new Date(String(payload.lastVerifiedDate))
                : null) || new Date();
            data.nextVerificationDate = computeNextVerificationDate(base, reminderIntervalDays);
        }
    }

    if (payload.markVerified === true) {
        const now = new Date();
        const reminderIntervalDays =
            typeof data.reminderIntervalDays === "number" ? data.reminderIntervalDays : undefined;
        const existing = await prisma.citationDirectory.findUnique({
            where: { id },
            select: { reminderIntervalDays: true },
        });
        const interval = reminderIntervalDays ?? existing?.reminderIntervalDays ?? 90;

        data.lastVerifiedDate = now;
        data.nextVerificationDate = computeNextVerificationDate(now, interval);
        data.status = CitationStatus.ACTIVE;
    }

    return prisma.citationDirectory.update({ where: { id }, data });
}

export async function deleteCitationDirectoryRow(id: string) {
    return prisma.citationDirectory.delete({ where: { id } });
}

export async function buildCitationAudit(options: { ensureSeed?: boolean } = {}): Promise<CitationAuditPayload> {
    if (options.ensureSeed !== false) {
        await ensureCitationDirectorySeeded();
    }

    const [canonical, citations] = await Promise.all([getCanonicalNapSettings(), getCitationDirectoryRows()]);
    const now = Date.now();

    const records = citations.map((citation) => {
        const mismatches = buildMismatches(citation, canonical);
        const isOverdue = citation.nextVerificationDate ? citation.nextVerificationDate.getTime() < now : false;
        const daysUntilReverify = citation.nextVerificationDate
            ? Math.ceil((citation.nextVerificationDate.getTime() - now) / DAY_MS)
            : null;
        const needsUpdate =
            citation.status === CitationStatus.NEEDS_UPDATE || mismatches.length > 0 || isOverdue;

        return {
            citation,
            mismatches,
            mismatchFields: mismatches.map((x) => x.field),
            needsUpdate,
            shouldCreate: citation.status === CitationStatus.NOT_LISTED,
            isOverdue,
            daysUntilReverify,
        } satisfies CitationAuditRecord;
    });

    const summary: CitationAuditSummary = {
        total: citations.length,
        active: citations.filter((x) => x.status === CitationStatus.ACTIVE).length,
        pending: citations.filter((x) => x.status === CitationStatus.PENDING).length,
        needsUpdate: records.filter((x) => x.needsUpdate).length,
        notListed: citations.filter((x) => x.status === CitationStatus.NOT_LISTED).length,
        overdue: records.filter((x) => x.isOverdue).length,
        mismatched: records.filter((x) => x.mismatches.length > 0).length,
    };

    return { canonical, citations, records, summary };
}

export async function getCitationNeedsUpdateCount() {
    try {
        const count = await prisma.citationDirectory.count();
        if (count === 0) {
            await ensureCitationDirectorySeeded();
        }
        const report = await buildCitationAudit({ ensureSeed: false });
        return report.summary.needsUpdate;
    } catch {
        return 0;
    }
}

function csvEscape(value: unknown): string {
    const text = String(value ?? "");
    if (/[,"\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export function buildCitationAuditCsv(report: CitationAuditPayload): string {
    const header = [
        "platform_name",
        "category",
        "status",
        "needs_update",
        "mismatch_fields",
        "mismatch_details",
        "last_verified_date",
        "next_verification_date",
        "listing_url",
        "name_as_listed",
        "address_as_listed",
        "phone_as_listed",
        "website_as_listed",
        "canonical_name",
        "canonical_address",
        "canonical_phone",
        "canonical_website",
        "notes",
    ];

    const inconsistentRows = report.records.filter((record) => record.needsUpdate || record.shouldCreate);

    const rows = inconsistentRows.map((record) => {
        const mismatchDetails = record.mismatches
            .map((m) => `${m.field}: expected="${m.expected}" actual="${m.actual || "(blank)"}"`)
            .join(" | ");

        return [
            record.citation.platformName,
            record.citation.category,
            record.citation.status,
            record.needsUpdate ? "yes" : "no",
            record.mismatchFields.join(";"),
            mismatchDetails,
            record.citation.lastVerifiedDate ? record.citation.lastVerifiedDate.toISOString() : "",
            record.citation.nextVerificationDate ? record.citation.nextVerificationDate.toISOString() : "",
            record.citation.listingUrl || "",
            record.citation.nameAsListed || "",
            record.citation.addressAsListed || "",
            record.citation.phoneAsListed || "",
            record.citation.websiteAsListed || "",
            report.canonical.businessName,
            report.canonical.address,
            report.canonical.phone,
            report.canonical.websiteUrl,
            record.citation.notes || "",
        ];
    });

    return [header, ...rows]
        .map((cols) => cols.map((value) => csvEscape(value)).join(","))
        .join("\n");
}
