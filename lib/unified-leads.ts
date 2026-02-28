import {
    Prisma,
    UnifiedLeadMembershipTier,
    UnifiedLeadSource,
    UnifiedLeadStatus,
    type EmployerInquiry,
    type WaitlistSignup,
    type ChatbotLead,
    type Lead as CampaignLead,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { stateDisplayName } from "@/lib/us-states";
import { notifyStaleLeadDigest, notifyUnifiedLeadCreated } from "@/lib/notify";
import { EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS, MEMBERSHIP_MONTHLY_DOLLARS } from "@/lib/pricing";

type SourceLeadUpsertInput = {
    source: UnifiedLeadSource;
    sourceRecordType: string;
    sourceRecordId: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    state?: string | null;
    sourcePage?: string | null;
    sourceMeta?: Prisma.InputJsonValue | null;
    suggestedStatus?: UnifiedLeadStatus | null;
    membershipTier?: UnifiedLeadMembershipTier | null;
    monthlyMembershipRate?: number | null;
    createdAt?: Date | null;
};

export type UnifiedLeadFilters = {
    source?: UnifiedLeadSource | "ALL";
    status?: UnifiedLeadStatus | "ALL";
    state?: string | "ALL";
    q?: string;
    dateFrom?: Date | null;
    dateTo?: Date | null;
};

export type UnifiedLeadListOptions = UnifiedLeadFilters & {
    page?: number;
    pageSize?: number;
};

export const UNIFIED_LEAD_SOURCE_LABELS: Record<UnifiedLeadSource, string> = {
    CHATBOT: "Chatbot",
    EMPLOYER_INQUIRY: "Employer inquiry",
    WAITLIST: "State waitlist",
    CONTACT_FORM: "Contact form",
    MANUAL: "Manual",
    ASSESSMENT: "Health assessment",
};

export const UNIFIED_LEAD_STATUS_LABELS: Record<UnifiedLeadStatus, string> = {
    NEW: "New",
    CONTACTED: "Contacted",
    CONSULTATION_SCHEDULED: "Consultation scheduled",
    ENROLLED: "Enrolled",
    LOST: "Lost",
};

export const UNIFIED_LEAD_MEMBERSHIP_LABELS: Record<UnifiedLeadMembershipTier, string> = {
    INDIVIDUAL: "Individual",
    COUPLE: "Couple",
    FAMILY: "Family",
    EMPLOYER: "Employer",
    CUSTOM: "Custom",
};

const STATUS_TRANSITIONS: Record<UnifiedLeadStatus, UnifiedLeadStatus[]> = {
    NEW: [UnifiedLeadStatus.CONTACTED, UnifiedLeadStatus.CONSULTATION_SCHEDULED, UnifiedLeadStatus.LOST],
    CONTACTED: [UnifiedLeadStatus.NEW, UnifiedLeadStatus.CONSULTATION_SCHEDULED, UnifiedLeadStatus.ENROLLED, UnifiedLeadStatus.LOST],
    CONSULTATION_SCHEDULED: [UnifiedLeadStatus.CONTACTED, UnifiedLeadStatus.ENROLLED, UnifiedLeadStatus.LOST],
    ENROLLED: [UnifiedLeadStatus.LOST],
    LOST: [UnifiedLeadStatus.NEW, UnifiedLeadStatus.CONTACTED],
};

const DEFAULT_TIER_RATE: Record<UnifiedLeadMembershipTier, number> = {
    INDIVIDUAL: MEMBERSHIP_MONTHLY_DOLLARS,
    COUPLE: MEMBERSHIP_MONTHLY_DOLLARS,
    FAMILY: MEMBERSHIP_MONTHLY_DOLLARS,
    EMPLOYER: EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS,
    CUSTOM: MEMBERSHIP_MONTHLY_DOLLARS,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function cleanText(value: unknown, max = 200) {
    const text = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!text) return "";
    return text.slice(0, max);
}

function cleanEmail(value: unknown) {
    return cleanText(value, 254).toLowerCase();
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeOptional(value: unknown, max = 200) {
    const text = cleanText(value, max);
    return text || null;
}

function normalizeState(value: unknown) {
    const raw = cleanText(value, 80);
    if (!raw) return null;
    return stateDisplayName(raw);
}

function safeMonthlyRate(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.trunc(n);
}

function parseDate(value: unknown, mode: "start" | "end") {
    const raw = cleanText(value, 30);
    if (!raw) return null;
    const withTime = mode === "start" ? `${raw}T00:00:00.000Z` : `${raw}T23:59:59.999Z`;
    const d = new Date(withTime);
    return Number.isFinite(d.getTime()) ? d : null;
}

function splitName(fullName: string) {
    const parts = cleanText(fullName, 160).split(" ").filter(Boolean);
    if (!parts.length) return { firstName: null, lastName: null };
    return {
        firstName: parts[0] || null,
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
    };
}

function toJsonObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function statusProgressRank(status: UnifiedLeadStatus) {
    if (status === UnifiedLeadStatus.NEW) return 0;
    if (status === UnifiedLeadStatus.CONTACTED) return 1;
    if (status === UnifiedLeadStatus.CONSULTATION_SCHEDULED) return 2;
    if (status === UnifiedLeadStatus.ENROLLED) return 3;
    return -1;
}

function maybePromoteStatus(current: UnifiedLeadStatus, suggested?: UnifiedLeadStatus | null) {
    if (!suggested || suggested === current) return current;
    if (current === UnifiedLeadStatus.ENROLLED) return current;

    if (suggested === UnifiedLeadStatus.LOST) {
        return UnifiedLeadStatus.LOST;
    }

    if (current === UnifiedLeadStatus.LOST) {
        if (suggested === UnifiedLeadStatus.NEW || suggested === UnifiedLeadStatus.CONTACTED) return suggested;
        return current;
    }

    return statusProgressRank(suggested) > statusProgressRank(current) ? suggested : current;
}

function canTransitionStatus(from: UnifiedLeadStatus, to: UnifiedLeadStatus) {
    if (from === to) return true;
    return STATUS_TRANSITIONS[from].includes(to);
}

function getTierRate(
    membershipTier: UnifiedLeadMembershipTier | null | undefined,
    monthlyMembershipRate: number | null | undefined
) {
    if (typeof monthlyMembershipRate === "number" && monthlyMembershipRate > 0) return monthlyMembershipRate;
    if (membershipTier) return DEFAULT_TIER_RATE[membershipTier] || MEMBERSHIP_MONTHLY_DOLLARS;
    return MEMBERSHIP_MONTHLY_DOLLARS;
}

export function parseUnifiedLeadFilters(params: URLSearchParams): UnifiedLeadFilters {
    const sourceRaw = cleanText(params.get("source"), 40).toUpperCase();
    const statusRaw = cleanText(params.get("status"), 40).toUpperCase();
    const stateRaw = cleanText(params.get("state"), 80);

    const source =
        sourceRaw && sourceRaw !== "ALL" && Object.values(UnifiedLeadSource).includes(sourceRaw as UnifiedLeadSource)
            ? (sourceRaw as UnifiedLeadSource)
            : "ALL";
    const status =
        statusRaw && statusRaw !== "ALL" && Object.values(UnifiedLeadStatus).includes(statusRaw as UnifiedLeadStatus)
            ? (statusRaw as UnifiedLeadStatus)
            : "ALL";

    return {
        source,
        status,
        state: stateRaw || "ALL",
        q: cleanText(params.get("q"), 200),
        dateFrom: parseDate(params.get("dateFrom"), "start"),
        dateTo: parseDate(params.get("dateTo"), "end"),
    };
}

function buildWhere(filters: UnifiedLeadFilters): Prisma.UnifiedLeadWhereInput {
    const where: Prisma.UnifiedLeadWhereInput = {};

    if (filters.source && filters.source !== "ALL") where.source = filters.source;
    if (filters.status && filters.status !== "ALL") where.status = filters.status;
    if (filters.state && filters.state !== "ALL") where.state = stateDisplayName(filters.state);

    if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    if (filters.q) {
        where.OR = [
            { firstName: { contains: filters.q, mode: "insensitive" } },
            { lastName: { contains: filters.q, mode: "insensitive" } },
            { email: { contains: filters.q, mode: "insensitive" } },
            { phone: { contains: filters.q, mode: "insensitive" } },
            { notes: { contains: filters.q, mode: "insensitive" } },
        ];
    }

    return where;
}

export function buildStaleLeadWhere(now = new Date()): Prisma.UnifiedLeadWhereInput {
    const staleNewDate = new Date(now.getTime() - DAY_MS);
    const staleContactedDate = new Date(now.getTime() - 7 * DAY_MS);

    return {
        OR: [
            {
                status: UnifiedLeadStatus.NEW,
                statusUpdatedAt: { lt: staleNewDate },
            },
            {
                status: UnifiedLeadStatus.CONTACTED,
                statusUpdatedAt: { lt: staleContactedDate },
            },
        ],
    };
}

export function isLeadStale(
    lead: Pick<{
        status: UnifiedLeadStatus;
        statusUpdatedAt: Date;
    }, "status" | "statusUpdatedAt">,
    now = new Date()
) {
    if (lead.status === UnifiedLeadStatus.NEW) {
        return lead.statusUpdatedAt.getTime() < now.getTime() - DAY_MS;
    }
    if (lead.status === UnifiedLeadStatus.CONTACTED) {
        return lead.statusUpdatedAt.getTime() < now.getTime() - 7 * DAY_MS;
    }
    return false;
}

async function notifyNewLead(leadId: string) {
    const lead = await prisma.unifiedLead.findUnique({
        where: { id: leadId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            state: true,
            source: true,
            sourcePage: true,
            status: true,
            createdAt: true,
            sourceMeta: true,
            newLeadNotifiedAt: true,
        },
    });
    if (!lead || lead.newLeadNotifiedAt) return { attempted: false, ok: false };

    try {
        await notifyUnifiedLeadCreated({
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
            state: lead.state,
            source: lead.source,
            sourcePage: lead.sourcePage,
            status: lead.status,
            createdAt: lead.createdAt,
            sourceMeta: lead.sourceMeta,
        });
    } catch (error) {
        console.error("[UnifiedLeads] Failed to send new lead notification", error);
    } finally {
        await prisma.unifiedLead.update({
            where: { id: lead.id },
            data: { newLeadNotifiedAt: new Date() },
        });
    }

    return { attempted: true, ok: true };
}

async function upsertLeadFromSource(input: SourceLeadUpsertInput) {
    const email = cleanEmail(input.email);
    if (!email || !isValidEmail(email) || !input.sourceRecordId) {
        return { action: "skipped" as const };
    }

    return prisma.$transaction(async (tx) => {
        const existing = await tx.unifiedLead.findUnique({
            where: {
                source_sourceRecordId: {
                    source: input.source,
                    sourceRecordId: input.sourceRecordId,
                },
            },
        });

        const normalizedState = normalizeState(input.state);
        const normalizedPhone = normalizeOptional(input.phone, 40);
        const normalizedSourcePage = normalizeOptional(input.sourcePage, 200);
        const normalizedFirstName = normalizeOptional(input.firstName, 80);
        const normalizedLastName = normalizeOptional(input.lastName, 120);
        const normalizedTier = input.membershipTier || null;
        const normalizedRate = safeMonthlyRate(input.monthlyMembershipRate);
        const suggestedStatus = input.suggestedStatus || UnifiedLeadStatus.NEW;

        const sourceMeta = toJsonObject(input.sourceMeta);

        if (!existing) {
            const createdAt = input.createdAt && Number.isFinite(input.createdAt.getTime()) ? input.createdAt : new Date();
            const nextStatus = suggestedStatus;
            const lead = await tx.unifiedLead.create({
                data: {
                    firstName: normalizedFirstName,
                    lastName: normalizedLastName,
                    email,
                    phone: normalizedPhone,
                    state: normalizedState,
                    source: input.source,
                    sourcePage: normalizedSourcePage,
                    status: nextStatus,
                    membershipTier: normalizedTier,
                    monthlyMembershipRate: normalizedRate,
                    sourceRecordType: cleanText(input.sourceRecordType, 80) || null,
                    sourceRecordId: input.sourceRecordId,
                    sourceMeta: sourceMeta as Prisma.InputJsonValue,
                    statusUpdatedAt: createdAt,
                    createdAt,
                    enrolledAt: nextStatus === UnifiedLeadStatus.ENROLLED ? createdAt : null,
                },
            });

            await tx.unifiedLeadActivity.create({
                data: {
                    leadId: lead.id,
                    type: "CREATED",
                    toStatus: lead.status,
                    metadata: {
                        source: lead.source,
                        sourceRecordType: lead.sourceRecordType,
                        sourceRecordId: lead.sourceRecordId,
                    } as Prisma.InputJsonValue,
                },
            });

            return { action: "created" as const, leadId: lead.id };
        }

        const updateData: Prisma.UnifiedLeadUpdateInput = {};
        let createStatusActivity = false;

        if (normalizedFirstName && normalizedFirstName !== existing.firstName) updateData.firstName = normalizedFirstName;
        if (normalizedLastName && normalizedLastName !== existing.lastName) updateData.lastName = normalizedLastName;
        if (normalizedPhone && normalizedPhone !== existing.phone) updateData.phone = normalizedPhone;
        if (normalizedState && normalizedState !== existing.state) updateData.state = normalizedState;
        if (normalizedSourcePage && normalizedSourcePage !== existing.sourcePage) updateData.sourcePage = normalizedSourcePage;
        if (normalizedTier && normalizedTier !== existing.membershipTier) updateData.membershipTier = normalizedTier;
        if (normalizedRate && normalizedRate !== existing.monthlyMembershipRate) updateData.monthlyMembershipRate = normalizedRate;

        const mergedMeta = {
            ...toJsonObject(existing.sourceMeta),
            ...sourceMeta,
        } as Prisma.InputJsonValue;
        updateData.sourceMeta = mergedMeta;

        const nextStatus = maybePromoteStatus(existing.status, suggestedStatus);
        if (nextStatus !== existing.status) {
            updateData.status = nextStatus;
            updateData.statusUpdatedAt = new Date();
            updateData.staleAlertSentAt = null;
            if (nextStatus === UnifiedLeadStatus.ENROLLED && !existing.enrolledAt) {
                updateData.enrolledAt = new Date();
            }
            createStatusActivity = true;
        }

        if (!Object.keys(updateData).length) {
            return { action: "unchanged" as const, leadId: existing.id };
        }

        const lead = await tx.unifiedLead.update({
            where: { id: existing.id },
            data: updateData,
        });

        if (createStatusActivity) {
            await tx.unifiedLeadActivity.create({
                data: {
                    leadId: lead.id,
                    type: "STATUS_CHANGED",
                    fromStatus: existing.status,
                    toStatus: lead.status,
                    metadata: {
                        sourceSync: true,
                        source: lead.source,
                    } as Prisma.InputJsonValue,
                },
            });
        }

        return { action: "updated" as const, leadId: lead.id };
    });
}

function mapEmployerStatus(status: string | null | undefined): UnifiedLeadStatus {
    const raw = cleanText(status, 40).toUpperCase();
    if (raw === "CONTACTED") return UnifiedLeadStatus.CONTACTED;
    if (raw === "CONVERTED") return UnifiedLeadStatus.ENROLLED;
    if (raw === "CLOSED") return UnifiedLeadStatus.LOST;
    return UnifiedLeadStatus.NEW;
}

function mapCampaignLeadStatus(status: string | null | undefined): UnifiedLeadStatus {
    const raw = cleanText(status, 40).toUpperCase();
    if (raw === "BOOKED") return UnifiedLeadStatus.CONSULTATION_SCHEDULED;
    if (raw === "CONVERTED" || raw === "ENROLLED") return UnifiedLeadStatus.ENROLLED;
    if (raw === "LOST" || raw === "CLOSED") return UnifiedLeadStatus.LOST;
    if (raw === "CONTACTED") return UnifiedLeadStatus.CONTACTED;
    return UnifiedLeadStatus.NEW;
}

function mapEmployerTier(inquiry: EmployerInquiry): UnifiedLeadMembershipTier {
    const range = cleanText(inquiry.employeeCountRange, 30);
    if (range) return UnifiedLeadMembershipTier.EMPLOYER;
    if (typeof inquiry.employeeCount === "number" && inquiry.employeeCount >= 5) return UnifiedLeadMembershipTier.EMPLOYER;
    return UnifiedLeadMembershipTier.CUSTOM;
}

function buildSourcePageFromCampaignLead(lead: CampaignLead & {
    campaignRun?: { campaign?: { landingSlug: string } | null } | null;
}) {
    const meta = toJsonObject(lead.metadata);
    const direct =
        normalizeOptional(meta.sourcePage, 200) ||
        normalizeOptional(meta.source_page, 200) ||
        normalizeOptional(meta.pagePath, 200) ||
        normalizeOptional(meta.page_path, 200);
    if (direct) return direct;
    const landingSlug = lead.campaignRun?.campaign?.landingSlug;
    return landingSlug ? `/lp/${landingSlug}` : "/join";
}

function buildLeadNameFromMetadata(meta: Record<string, unknown>) {
    const first =
        normalizeOptional(meta.firstName, 80) ||
        normalizeOptional(meta.first_name, 80) ||
        normalizeOptional(meta.givenName, 80);
    const last =
        normalizeOptional(meta.lastName, 120) ||
        normalizeOptional(meta.last_name, 120) ||
        normalizeOptional(meta.familyName, 120);
    if (first || last) return { firstName: first, lastName: last };

    const full =
        normalizeOptional(meta.fullName, 160) ||
        normalizeOptional(meta.full_name, 160) ||
        normalizeOptional(meta.name, 160);
    if (!full) return { firstName: null, lastName: null };
    return splitName(full);
}

export async function upsertUnifiedLeadFromChatbotLead(lead: ChatbotLead, sendNotification = true) {
    const result = await upsertLeadFromSource({
        source: UnifiedLeadSource.CHATBOT,
        sourceRecordType: "ChatbotLead",
        sourceRecordId: lead.id,
        firstName: lead.firstName,
        email: lead.email,
        state: lead.state,
        sourcePage: "/join",
        sourceMeta: {
            heardAboutUs: lead.heardAboutUs || null,
            conversationSummary: lead.conversationSummary || null,
        } as Prisma.InputJsonValue,
        suggestedStatus: UnifiedLeadStatus.NEW,
        createdAt: lead.createdAt,
    });

    if (sendNotification && result.action === "created" && result.leadId) {
        await notifyNewLead(result.leadId);
    }

    return result;
}

export async function upsertUnifiedLeadFromEmployerInquiry(inquiry: EmployerInquiry, sendNotification = true) {
    const { firstName, lastName } = splitName(inquiry.contactName);
    const result = await upsertLeadFromSource({
        source: UnifiedLeadSource.EMPLOYER_INQUIRY,
        sourceRecordType: "EmployerInquiry",
        sourceRecordId: inquiry.id,
        firstName,
        lastName,
        email: inquiry.email,
        phone: inquiry.phone,
        sourcePage: "/for-employers",
        sourceMeta: {
            companyName: inquiry.companyName,
            employeeCount: inquiry.employeeCount,
            employeeCountRange: inquiry.employeeCountRange,
            message: inquiry.message || null,
            inquiryStatus: inquiry.status,
        } as Prisma.InputJsonValue,
        suggestedStatus: mapEmployerStatus(inquiry.status),
        membershipTier: mapEmployerTier(inquiry),
        monthlyMembershipRate: EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS,
        createdAt: inquiry.submittedAt,
    });

    if (sendNotification && result.action === "created" && result.leadId) {
        await notifyNewLead(result.leadId);
    }

    return result;
}

export async function upsertUnifiedLeadFromWaitlistSignup(signup: WaitlistSignup, sendNotification = true) {
    const result = await upsertLeadFromSource({
        source: UnifiedLeadSource.WAITLIST,
        sourceRecordType: "WaitlistSignup",
        sourceRecordId: signup.id,
        email: signup.email,
        state: signup.stateInterest,
        sourcePage: "/states",
        sourceMeta: {
            stateInterest: signup.stateInterest || null,
        } as Prisma.InputJsonValue,
        suggestedStatus: UnifiedLeadStatus.NEW,
        createdAt: signup.submittedAt,
    });

    if (sendNotification && result.action === "created" && result.leadId) {
        await notifyNewLead(result.leadId);
    }

    return result;
}

export async function upsertUnifiedLeadFromCampaignLead(
    lead: CampaignLead & {
        campaignRun?: { campaign?: { landingSlug: string } | null } | null;
    },
    sendNotification = true
) {
    const email = cleanEmail(lead.email);
    if (!email) return { action: "skipped" as const };

    const metadata = toJsonObject(lead.metadata);
    const { firstName, lastName } = buildLeadNameFromMetadata(metadata);
    const phone = normalizeOptional(metadata.phone, 40) || normalizeOptional(metadata.phone_number, 40);
    const state = normalizeState(metadata.state);

    const result = await upsertLeadFromSource({
        source: UnifiedLeadSource.CONTACT_FORM,
        sourceRecordType: "Lead",
        sourceRecordId: lead.id,
        firstName,
        lastName,
        email,
        phone,
        state,
        sourcePage: buildSourcePageFromCampaignLead(lead),
        sourceMeta: {
            runId: lead.campaignRunId,
            gclid: lead.gclid || null,
            adLeadStatus: lead.status,
            metadata,
        } as Prisma.InputJsonValue,
        suggestedStatus: mapCampaignLeadStatus(lead.status),
        createdAt: lead.createdAt,
    });

    if (sendNotification && result.action === "created" && result.leadId) {
        await notifyNewLead(result.leadId);
    }

    return result;
}

export async function upsertUnifiedLeadFromWebsiteRegistration(
    input: {
        sourceRecordId?: string | null;
        email: string;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        state?: string | null;
        sourcePage?: string | null;
        membershipTier?: UnifiedLeadMembershipTier | null;
        monthlyMembershipRate?: number | null;
        suggestedStatus?: UnifiedLeadStatus | null;
        createdAt?: Date | null;
        sourceMeta?: Prisma.InputJsonValue | null;
    },
    sendNotification = true
) {
    const email = cleanEmail(input.email);
    if (!email) return { action: "skipped" as const };

    const sourceRecordId =
        cleanText(input.sourceRecordId, 120) ||
        `register:${email}`;

    const result = await upsertLeadFromSource({
        source: UnifiedLeadSource.CONTACT_FORM,
        sourceRecordType: "WebsiteRegistration",
        sourceRecordId,
        firstName: input.firstName || null,
        lastName: input.lastName || null,
        email,
        phone: input.phone || null,
        state: input.state || null,
        sourcePage: input.sourcePage || "/register",
        sourceMeta:
            (toJsonObject(input.sourceMeta) as Prisma.InputJsonValue) ||
            ({ channel: "website" } as Prisma.InputJsonValue),
        suggestedStatus: input.suggestedStatus || UnifiedLeadStatus.NEW,
        membershipTier: input.membershipTier || null,
        monthlyMembershipRate: input.monthlyMembershipRate || null,
        createdAt: input.createdAt || null,
    });

    if (sendNotification && result.action === "created" && result.leadId) {
        await notifyNewLead(result.leadId);
    }

    return result;
}

export async function upsertUnifiedLeadFromCalBooking(
    input: {
        sourceRecordId?: string | null;
        email: string;
        fullName?: string | null;
        firstName?: string | null;
        lastName?: string | null;
        phone?: string | null;
        state?: string | null;
        sourcePage?: string | null;
        sourceMeta?: Prisma.InputJsonValue | null;
        createdAt?: Date | null;
    },
    sendNotification = true
) {
    const email = cleanEmail(input.email);
    if (!email) return { action: "skipped" as const };

    const split = input.fullName ? splitName(input.fullName) : { firstName: null, lastName: null };
    const firstName = input.firstName || split.firstName;
    const lastName = input.lastName || split.lastName;

    const sourceRecordId =
        cleanText(input.sourceRecordId, 120) ||
        `cal:${email}`;

    const result = await upsertLeadFromSource({
        source: UnifiedLeadSource.CONTACT_FORM,
        sourceRecordType: "CalBooking",
        sourceRecordId,
        firstName,
        lastName,
        email,
        phone: input.phone || null,
        state: input.state || null,
        sourcePage: input.sourcePage || "/join",
        sourceMeta:
            (toJsonObject(input.sourceMeta) as Prisma.InputJsonValue) ||
            ({ source: "cal-webhook" } as Prisma.InputJsonValue),
        suggestedStatus: UnifiedLeadStatus.CONSULTATION_SCHEDULED,
        createdAt: input.createdAt || null,
    });

    if (sendNotification && result.action === "created" && result.leadId) {
        await notifyNewLead(result.leadId);
    }

    return result;
}

export async function syncUnifiedLeadsFromSources(options?: {
    limitPerSource?: number;
    sendNotifications?: boolean;
}) {
    const limitPerSource = Number.isFinite(options?.limitPerSource)
        ? Math.max(50, Math.min(10000, Math.trunc(options?.limitPerSource || 1000)))
        : 1000;
    const sendNotifications = options?.sendNotifications ?? true;

    const [chatbotLeads, employerInquiries, waitlistSignups, campaignLeads] = await Promise.all([
        prisma.chatbotLead.findMany({
            orderBy: { createdAt: "asc" },
            take: limitPerSource,
        }),
        prisma.employerInquiry.findMany({
            orderBy: { submittedAt: "asc" },
            take: limitPerSource,
        }),
        prisma.waitlistSignup.findMany({
            orderBy: { submittedAt: "asc" },
            take: limitPerSource,
        }),
        prisma.lead.findMany({
            where: { email: { not: null } },
            orderBy: { createdAt: "asc" },
            take: limitPerSource,
            include: {
                campaignRun: {
                    select: {
                        campaign: {
                            select: { landingSlug: true },
                        },
                    },
                },
            },
        }),
    ]);

    let created = 0;
    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    const sourceCounts: Record<UnifiedLeadSource, number> = {
        CHATBOT: 0,
        EMPLOYER_INQUIRY: 0,
        WAITLIST: 0,
        CONTACT_FORM: 0,
        MANUAL: 0,
    };

    for (const lead of chatbotLeads) {
        const result = await upsertUnifiedLeadFromChatbotLead(lead, sendNotifications);
        sourceCounts.CHATBOT += 1;
        if (result.action === "created") created += 1;
        else if (result.action === "updated") updated += 1;
        else if (result.action === "unchanged") unchanged += 1;
        else skipped += 1;
    }

    for (const inquiry of employerInquiries) {
        const result = await upsertUnifiedLeadFromEmployerInquiry(inquiry, sendNotifications);
        sourceCounts.EMPLOYER_INQUIRY += 1;
        if (result.action === "created") created += 1;
        else if (result.action === "updated") updated += 1;
        else if (result.action === "unchanged") unchanged += 1;
        else skipped += 1;
    }

    for (const signup of waitlistSignups) {
        const result = await upsertUnifiedLeadFromWaitlistSignup(signup, sendNotifications);
        sourceCounts.WAITLIST += 1;
        if (result.action === "created") created += 1;
        else if (result.action === "updated") updated += 1;
        else if (result.action === "unchanged") unchanged += 1;
        else skipped += 1;
    }

    for (const lead of campaignLeads) {
        const result = await upsertUnifiedLeadFromCampaignLead(lead, sendNotifications);
        sourceCounts.CONTACT_FORM += 1;
        if (result.action === "created") created += 1;
        else if (result.action === "updated") updated += 1;
        else if (result.action === "unchanged") unchanged += 1;
        else skipped += 1;
    }

    return {
        success: true,
        sourceCounts,
        created,
        updated,
        unchanged,
        skipped,
        processed:
            sourceCounts.CHATBOT +
            sourceCounts.EMPLOYER_INQUIRY +
            sourceCounts.WAITLIST +
            sourceCounts.CONTACT_FORM,
    };
}

export async function createManualUnifiedLead(
    input: {
        firstName?: string | null;
        lastName?: string | null;
        email: string;
        phone?: string | null;
        state?: string | null;
        sourcePage?: string | null;
        status?: UnifiedLeadStatus;
        notes?: string | null;
        membershipTier?: UnifiedLeadMembershipTier | null;
        monthlyMembershipRate?: number | null;
        assignedPhysicianId?: string | null;
    },
    options?: { createdByUserId?: string | null; sendNotification?: boolean }
) {
    const email = cleanEmail(input.email);
    if (!isValidEmail(email)) throw new Error("Valid email is required");

    const status = input.status || UnifiedLeadStatus.NEW;
    const createdAt = new Date();
    const normalizedTier = input.membershipTier || null;
    const normalizedRate = safeMonthlyRate(input.monthlyMembershipRate);

    const lead = await prisma.unifiedLead.create({
        data: {
            firstName: normalizeOptional(input.firstName, 80),
            lastName: normalizeOptional(input.lastName, 120),
            email,
            phone: normalizeOptional(input.phone, 40),
            state: normalizeState(input.state),
            source: UnifiedLeadSource.MANUAL,
            sourcePage: normalizeOptional(input.sourcePage, 200),
            status,
            notes: normalizeOptional(input.notes, 4000),
            membershipTier: normalizedTier,
            monthlyMembershipRate: normalizedRate,
            assignedPhysicianId: normalizeOptional(input.assignedPhysicianId, 64),
            sourceRecordType: "Manual",
            sourceMeta: {
                createdManually: true,
            } as Prisma.InputJsonValue,
            statusUpdatedAt: createdAt,
            enrolledAt: status === UnifiedLeadStatus.ENROLLED ? createdAt : null,
        },
    });

    await prisma.unifiedLeadActivity.create({
        data: {
            leadId: lead.id,
            type: "CREATED",
            toStatus: lead.status,
            note: lead.notes || null,
            createdByUserId: options?.createdByUserId || null,
            metadata: {
                source: "MANUAL",
            } as Prisma.InputJsonValue,
        },
    });

    if ((options?.sendNotification ?? true) && lead.status === UnifiedLeadStatus.NEW) {
        await notifyNewLead(lead.id);
    }

    return lead;
}

export async function updateUnifiedLead(
    id: string,
    input: {
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
        state?: string | null;
        sourcePage?: string | null;
        notes?: string | null;
        membershipTier?: UnifiedLeadMembershipTier | null;
        monthlyMembershipRate?: number | null;
        assignedPhysicianId?: string | null;
    },
    options?: { updatedByUserId?: string | null }
) {
    const existing = await prisma.unifiedLead.findUnique({ where: { id } });
    if (!existing) throw new Error("Lead not found");

    const updateData: Prisma.UnifiedLeadUpdateInput = {};

    if (input.firstName !== undefined) updateData.firstName = normalizeOptional(input.firstName, 80);
    if (input.lastName !== undefined) updateData.lastName = normalizeOptional(input.lastName, 120);
    if (input.phone !== undefined) updateData.phone = normalizeOptional(input.phone, 40);
    if (input.state !== undefined) updateData.state = normalizeState(input.state);
    if (input.sourcePage !== undefined) updateData.sourcePage = normalizeOptional(input.sourcePage, 200);
    if (input.notes !== undefined) updateData.notes = normalizeOptional(input.notes, 10000);
    if (input.membershipTier !== undefined) updateData.membershipTier = input.membershipTier;
    if (input.monthlyMembershipRate !== undefined) updateData.monthlyMembershipRate = safeMonthlyRate(input.monthlyMembershipRate);
    if (input.assignedPhysicianId !== undefined) {
        const normalizedAssignedPhysicianId = normalizeOptional(input.assignedPhysicianId, 64);
        updateData.assignedPhysician = normalizedAssignedPhysicianId
            ? { connect: { id: normalizedAssignedPhysicianId } }
            : { disconnect: true };
    }

    if (input.email !== undefined) {
        const email = cleanEmail(input.email);
        if (!isValidEmail(email)) throw new Error("Valid email is required");
        updateData.email = email;
    }

    if (!Object.keys(updateData).length) return existing;

    const lead = await prisma.unifiedLead.update({
        where: { id },
        data: updateData,
    });

    await prisma.unifiedLeadActivity.create({
        data: {
            leadId: lead.id,
            type: "LEAD_UPDATED",
            createdByUserId: options?.updatedByUserId || null,
            metadata: {
                updatedFields: Object.keys(updateData),
            } as Prisma.InputJsonValue,
        },
    });

    return lead;
}

export async function updateUnifiedLeadStatus(
    id: string,
    nextStatus: UnifiedLeadStatus,
    options?: { updatedByUserId?: string | null; note?: string | null }
) {
    const lead = await prisma.unifiedLead.findUnique({ where: { id } });
    if (!lead) throw new Error("Lead not found");

    if (!canTransitionStatus(lead.status, nextStatus)) {
        throw new Error(
            `Invalid status transition: ${UNIFIED_LEAD_STATUS_LABELS[lead.status]} -> ${UNIFIED_LEAD_STATUS_LABELS[nextStatus]}`
        );
    }

    const now = new Date();
    const updateData: Prisma.UnifiedLeadUpdateInput = {
        status: nextStatus,
        statusUpdatedAt: now,
        staleAlertSentAt: null,
    };

    if (nextStatus === UnifiedLeadStatus.ENROLLED) {
        updateData.enrolledAt = lead.enrolledAt || now;
        if (!lead.monthlyMembershipRate) {
            updateData.monthlyMembershipRate = getTierRate(lead.membershipTier, lead.monthlyMembershipRate);
        }
    }

    const updated = await prisma.unifiedLead.update({
        where: { id },
        data: updateData,
    });

    await prisma.unifiedLeadActivity.create({
        data: {
            leadId: updated.id,
            type: "STATUS_CHANGED",
            fromStatus: lead.status,
            toStatus: nextStatus,
            note: normalizeOptional(options?.note, 500),
            createdByUserId: options?.updatedByUserId || null,
        },
    });

    return updated;
}

export async function addUnifiedLeadNote(
    id: string,
    note: string,
    options?: { createdByUserId?: string | null }
) {
    const text = cleanText(note, 2000);
    if (!text) throw new Error("Note is required");

    const lead = await prisma.unifiedLead.findUnique({
        where: { id },
        select: { id: true, notes: true },
    });
    if (!lead) throw new Error("Lead not found");

    const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const nextNotes = lead.notes
        ? `${lead.notes}\n[${timestamp}] ${text}`
        : `[${timestamp}] ${text}`;

    const updated = await prisma.unifiedLead.update({
        where: { id },
        data: { notes: nextNotes },
    });

    await prisma.unifiedLeadActivity.create({
        data: {
            leadId: id,
            type: "NOTE_ADDED",
            note: text,
            createdByUserId: options?.createdByUserId || null,
        },
    });

    return updated;
}

export async function getUnifiedLeadList(options: UnifiedLeadListOptions = {}) {
    const page = Number.isFinite(options.page) ? Math.max(1, Math.trunc(options.page || 1)) : 1;
    const pageSize = Number.isFinite(options.pageSize)
        ? Math.max(10, Math.min(250, Math.trunc(options.pageSize || 100)))
        : 100;
    const where = buildWhere(options);
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const [total, leads] = await prisma.$transaction([
        prisma.unifiedLead.count({ where }),
        prisma.unifiedLead.findMany({
            where,
            orderBy: [{ createdAt: "desc" }],
            skip,
            take: pageSize,
            include: {
                assignedPhysician: {
                    select: { id: true, name: true, slug: true },
                },
                activities: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        id: true,
                        type: true,
                        note: true,
                        createdAt: true,
                        fromStatus: true,
                        toStatus: true,
                    },
                },
            },
        }),
    ]);

    const rows = leads.map((lead) => ({
        ...lead,
        stale: isLeadStale(lead, now),
        fullName: [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || lead.email,
        sourceLabel: UNIFIED_LEAD_SOURCE_LABELS[lead.source],
        statusLabel: UNIFIED_LEAD_STATUS_LABELS[lead.status],
    }));

    return {
        rows,
        total,
        page,
        pageSize,
    };
}

export async function getUnifiedLeadDetail(id: string) {
    const lead = await prisma.unifiedLead.findUnique({
        where: { id },
        include: {
            assignedPhysician: {
                select: { id: true, name: true, slug: true },
            },
            activities: {
                orderBy: { createdAt: "desc" },
                take: 200,
                include: {
                    createdByUser: {
                        select: { id: true, name: true, email: true },
                    },
                },
            },
        },
    });

    if (!lead) return null;

    let chatbotSessionId: string | null = null;
    let chatbotLogCount = 0;
    if (lead.source === UnifiedLeadSource.CHATBOT && lead.sourceRecordId) {
        const [latest, total] = await prisma.$transaction([
            prisma.chatbotConversationLog.findFirst({
                where: { leadId: lead.sourceRecordId },
                orderBy: { createdAt: "desc" },
                select: { sessionId: true },
            }),
            prisma.chatbotConversationLog.count({
                where: { leadId: lead.sourceRecordId },
            }),
        ]);
        chatbotSessionId = latest?.sessionId || null;
        chatbotLogCount = total;
    }

    let employerInquiry: {
        companyName: string;
        employeeCount: number | null;
        employeeCountRange: string | null;
        message: string | null;
        status: string;
        submittedAt: Date;
    } | null = null;
    if (lead.source === UnifiedLeadSource.EMPLOYER_INQUIRY && lead.sourceRecordId) {
        employerInquiry = await prisma.employerInquiry.findUnique({
            where: { id: lead.sourceRecordId },
            select: {
                companyName: true,
                employeeCount: true,
                employeeCountRange: true,
                message: true,
                status: true,
                submittedAt: true,
            },
        });
    }

    return {
        ...lead,
        stale: isLeadStale(lead),
        fullName: [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim() || lead.email,
        sourceLabel: UNIFIED_LEAD_SOURCE_LABELS[lead.source],
        statusLabel: UNIFIED_LEAD_STATUS_LABELS[lead.status],
        chatbotSessionId,
        chatbotLogCount,
        employerInquiry,
    };
}

function monthKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
    const [y, m] = key.split("-").map((x) => Number.parseInt(x, 10));
    const d = new Date(Date.UTC(y, (m || 1) - 1, 1));
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export async function getUnifiedLeadMetrics(filters: UnifiedLeadFilters = {}) {
    const where = buildWhere(filters);
    const leads = await prisma.unifiedLead.findMany({
        where,
        select: {
            id: true,
            source: true,
            status: true,
            state: true,
            createdAt: true,
            statusUpdatedAt: true,
            enrolledAt: true,
            membershipTier: true,
            monthlyMembershipRate: true,
        },
        orderBy: { createdAt: "asc" },
    });

    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = now.getUTCMonth();
    const thisMonthStart = new Date(Date.UTC(utcYear, utcMonth, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(utcYear, utcMonth + 1, 1, 0, 0, 0, 0));
    const lastMonthStart = new Date(Date.UTC(utcYear, utcMonth - 1, 1, 0, 0, 0, 0));

    const thisMonthLeads = leads.filter((x) => x.createdAt >= thisMonthStart && x.createdAt < nextMonthStart);
    const lastMonthLeads = leads.filter((x) => x.createdAt >= lastMonthStart && x.createdAt < thisMonthStart);

    const enrolledNow = leads.filter((x) => x.status === UnifiedLeadStatus.ENROLLED);
    const openStatuses = new Set<UnifiedLeadStatus>([
        UnifiedLeadStatus.NEW,
        UnifiedLeadStatus.CONTACTED,
        UnifiedLeadStatus.CONSULTATION_SCHEDULED,
    ]);
    const openLeads = leads.filter((x) => openStatuses.has(x.status));

    const currentMRR = enrolledNow.reduce(
        (sum, lead) => sum + getTierRate(lead.membershipTier, lead.monthlyMembershipRate),
        0
    );
    const enrolledCount = enrolledNow.length;
    const avgRate = enrolledCount > 0 ? currentMRR / enrolledCount : MEMBERSHIP_MONTHLY_DOLLARS;

    const conversion = (items: typeof leads) => {
        if (!items.length) return 0;
        const converted = items.filter((x) => x.status === UnifiedLeadStatus.ENROLLED).length;
        return converted / items.length;
    };

    const conversionAllTime = conversion(leads);
    const conversionThisMonth = conversion(thisMonthLeads);
    const conversionLastMonth = conversion(lastMonthLeads);

    const enrollmentTimes = enrolledNow
        .filter((x) => x.enrolledAt && x.enrolledAt.getTime() >= x.createdAt.getTime())
        .map((x) => (x.enrolledAt!.getTime() - x.createdAt.getTime()) / DAY_MS);

    const averageLeadToEnrollmentDays = enrollmentTimes.length
        ? Number((enrollmentTimes.reduce((sum, value) => sum + value, 0) / enrollmentTimes.length).toFixed(1))
        : null;

    const thisMonthBySource = Object.values(UnifiedLeadSource).map((source) => {
        const count = thisMonthLeads.filter((x) => x.source === source).length;
        return {
            source,
            label: UNIFIED_LEAD_SOURCE_LABELS[source],
            count,
        };
    });

    const allTimeBySource = Object.values(UnifiedLeadSource).map((source) => {
        const count = leads.filter((x) => x.source === source).length;
        return {
            source,
            label: UNIFIED_LEAD_SOURCE_LABELS[source],
            count,
        };
    });

    const leadsByStateMap = new Map<string, number>();
    for (const lead of thisMonthLeads) {
        const state = cleanText(lead.state, 80);
        if (!state) continue;
        leadsByStateMap.set(state, (leadsByStateMap.get(state) || 0) + 1);
    }
    const leadsByState = [...leadsByStateMap.entries()]
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state))
        .slice(0, 20);

    const staleCounts = {
        total: leads.filter((x) => isLeadStale(x, now)).length,
        new: leads.filter((x) => x.status === UnifiedLeadStatus.NEW && isLeadStale(x, now)).length,
        contacted: leads.filter((x) => x.status === UnifiedLeadStatus.CONTACTED && isLeadStale(x, now)).length,
    };

    const enrolledByMonthMap = new Map<string, number>();
    for (const lead of enrolledNow) {
        const effectiveDate = lead.enrolledAt || lead.createdAt;
        const key = monthKey(effectiveDate);
        const rate = getTierRate(lead.membershipTier, lead.monthlyMembershipRate);
        enrolledByMonthMap.set(key, (enrolledByMonthMap.get(key) || 0) + rate);
    }

    const monthKeys = [...enrolledByMonthMap.keys()].sort();
    const mrrOverTime: Array<{
        key: string;
        label: string;
        monthAddedMrr: number;
        cumulativeMrr: number;
    }> = [];
    let cumulative = 0;
    for (const key of monthKeys) {
        const added = enrolledByMonthMap.get(key) || 0;
        cumulative += added;
        mrrOverTime.push({
            key,
            label: monthLabel(key),
            monthAddedMrr: added,
            cumulativeMrr: cumulative,
        });
    }

    const expectedNextMonthEnrollments = Math.round(openLeads.length * conversionAllTime);
    const projectedNextMonthMrr = currentMRR + expectedNextMonthEnrollments * avgRate;
    const annualRunRate = currentMRR * 12;

    return {
        totals: {
            allLeads: leads.length,
            leadsThisMonth: thisMonthLeads.length,
            leadsLastMonth: lastMonthLeads.length,
            openLeads: openLeads.length,
            enrolledCount,
            currentMRR,
            annualRunRate,
        },
        conversionRate: {
            thisMonth: conversionThisMonth,
            lastMonth: conversionLastMonth,
            allTime: conversionAllTime,
        },
        averageLeadToEnrollmentDays,
        bySource: {
            thisMonth: thisMonthBySource,
            allTime: allTimeBySource,
        },
        leadsByState,
        stale: staleCounts,
        mrr: {
            current: currentMRR,
            overTime: mrrOverTime,
            avgEnrolledMonthlyRate: Number(avgRate.toFixed(2)),
            projectedNextMonthMrr: Math.round(projectedNextMonthMrr),
            expectedNextMonthEnrollments,
        },
        goals: {
            arrTarget: 250000,
            arrProgress: annualRunRate / 250000,
            providerTwoMinMembers: 200,
            providerTwoMaxMembers: 250,
            providerTwoProgressToMin: enrolledCount / 200,
            providerTwoProgressToMax: enrolledCount / 250,
        },
    };
}

function csvEscape(value: unknown) {
    const text = String(value ?? "");
    if (/[,"\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

export async function buildUnifiedLeadCsv(filters: UnifiedLeadFilters = {}) {
    const where = buildWhere(filters);
    const leads = await prisma.unifiedLead.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        include: {
            assignedPhysician: {
                select: { id: true, name: true },
            },
        },
    });

    const header = [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone",
        "state",
        "source",
        "source_page",
        "status",
        "membership_tier",
        "monthly_membership_rate",
        "assigned_physician",
        "created_at",
        "status_updated_at",
        "enrolled_at",
        "stale",
        "notes",
        "source_meta",
    ];

    const rows = leads.map((lead) => [
        lead.id,
        lead.firstName || "",
        lead.lastName || "",
        lead.email,
        lead.phone || "",
        lead.state || "",
        lead.source,
        lead.sourcePage || "",
        lead.status,
        lead.membershipTier || "",
        lead.monthlyMembershipRate ?? "",
        lead.assignedPhysician?.name || "",
        lead.createdAt.toISOString(),
        lead.statusUpdatedAt.toISOString(),
        lead.enrolledAt ? lead.enrolledAt.toISOString() : "",
        isLeadStale(lead) ? "yes" : "no",
        lead.notes || "",
        JSON.stringify(lead.sourceMeta || {}),
    ]);

    return [header, ...rows]
        .map((row) => row.map((cell) => csvEscape(cell)).join(","))
        .join("\n");
}

export async function sendStaleLeadAlerts(options?: { force?: boolean; limit?: number }) {
    const limit = Number.isFinite(options?.limit)
        ? Math.max(1, Math.min(500, Math.trunc(options?.limit || 100)))
        : 100;

    const where: Prisma.UnifiedLeadWhereInput = {
        AND: [
            buildStaleLeadWhere(),
            options?.force ? {} : { staleAlertSentAt: null },
        ],
    };

    const staleLeads = await prisma.unifiedLead.findMany({
        where,
        orderBy: { statusUpdatedAt: "asc" },
        take: limit,
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            state: true,
            source: true,
            status: true,
            statusUpdatedAt: true,
            createdAt: true,
        },
    });

    if (!staleLeads.length) {
        return { success: true, sent: 0, staleLeadIds: [] as string[] };
    }

    try {
        await notifyStaleLeadDigest(staleLeads);
    } catch (error) {
        console.error("[UnifiedLeads] Failed to send stale lead alert digest", error);
    }

    const now = new Date();
    const ids = staleLeads.map((x) => x.id);
    await prisma.$transaction([
        prisma.unifiedLead.updateMany({
            where: { id: { in: ids } },
            data: { staleAlertSentAt: now },
        }),
        ...ids.map((leadId) =>
            prisma.unifiedLeadActivity.create({
                data: {
                    leadId,
                    type: "STALE_ALERT_SENT",
                    note: "Stale lead alert sent",
                },
            })
        ),
    ]);

    return { success: true, sent: staleLeads.length, staleLeadIds: ids };
}

export async function getLeadFollowUpCount() {
    try {
        return await prisma.unifiedLead.count({
            where: buildStaleLeadWhere(),
        });
    } catch {
        return 0;
    }
}

export async function getLeadFilterOptions() {
    const [states, physicians] = await Promise.all([
        prisma.unifiedLead.findMany({
            where: { state: { not: null } },
            distinct: ["state"],
            orderBy: { state: "asc" },
            select: { state: true },
        }),
        prisma.physician.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true, slug: true },
        }),
    ]);

    return {
        states: states.map((x) => x.state).filter((x): x is string => Boolean(x)),
        physicians,
        sourceOptions: Object.values(UnifiedLeadSource),
        statusOptions: Object.values(UnifiedLeadStatus),
        membershipTierOptions: Object.values(UnifiedLeadMembershipTier),
    };
}
