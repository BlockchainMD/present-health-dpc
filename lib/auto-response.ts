import crypto from "node:crypto";

import type {
    AutoResponseEmailLog,
    AutoResponseNurtureSequence,
    AutoResponseSequenceStatus,
    AutoResponseSource,
    AutoResponseStatus,
    AutoResponseTemplate,
    EmployerInquiry,
    Lead,
    Prisma,
    WaitlistSignup,
} from "@prisma/client";
import {
    AutoResponseSequenceStatus as AutoResponseSequenceStatusEnum,
    AutoResponseSource as AutoResponseSourceEnum,
    AutoResponseStatus as AutoResponseStatusEnum,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendEmail, type SendEmailResult } from "@/lib/email";
import { absoluteUrl } from "@/lib/site-url";
import { slugify } from "@/lib/slug";
import { stateFromNameOrCode, stateSlug } from "@/lib/us-states";

export const AUTO_RESPONSE_SOURCES: AutoResponseSource[] = [
    AutoResponseSourceEnum.GENERAL_CONTACT,
    AutoResponseSourceEnum.CHATBOT_LEAD,
    AutoResponseSourceEnum.EMPLOYER_INQUIRY,
    AutoResponseSourceEnum.STATE_WAITLIST,
];

export const AUTO_RESPONSE_SOURCE_LABELS: Record<AutoResponseSource, string> = {
    GENERAL_CONTACT: "General Contact / Chatbot",
    CHATBOT_LEAD: "Chatbot Lead",
    EMPLOYER_INQUIRY: "Employer Inquiry",
    STATE_WAITLIST: "State Waitlist",
    ASSESSMENT_LEAD: "Health Assessment",
};

export const AUTO_RESPONSE_STATUS_LABELS: Record<AutoResponseStatus, string> = {
    PENDING: "Pending",
    SENT: "Sent",
    FAILED: "Failed",
    SKIPPED: "Skipped",
    UNSUBSCRIBED: "Unsubscribed",
};

const AUTO_RESPONSE_TOKEN_VERSION = 1;
const OPEN_TRACKING_GIF = Buffer.from("R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");

type TemplateDefaults = {
    enabled: boolean;
    delayMinutes: number;
    subjectTemplate: string;
    bodyTemplate: string;
    followUpEnabled: boolean;
    followUpDelayHours: number;
    followUpSubjectTemplate: string;
    followUpBodyTemplate: string;
};

const TEMPLATE_DEFAULTS: Record<AutoResponseSource, TemplateDefaults> = {
    GENERAL_CONTACT: {
        enabled: true,
        delayMinutes: 0,
        subjectTemplate: "Thanks for reaching out to Present Health, {first_name}",
        bodyTemplate: [
            "Hi {first_name},",
            "",
            "Thank you for reaching out to Present Health.",
            "",
            "Here is what to expect next:",
            "- We will follow up within 24 hours.",
            "- You can review membership details now:",
            "  Pricing: {pricing_url}",
            "  How it works: {how_it_works_url}",
            "  State availability: {state_page_url}",
            "",
            "Ready to get started? {join_url}",
            "",
            "Warmly,",
            "{physician_name}",
            "{physician_credentials}",
        ].join("\n"),
        followUpEnabled: false,
        followUpDelayHours: 72,
        followUpSubjectTemplate: "Just checking in from Present Health",
        followUpBodyTemplate: [
            "Hi {first_name},",
            "",
            "Just checking in to see if you still want help getting started with Present Health.",
            "",
            "Quick links:",
            "- Pricing: {pricing_url}",
            "- How it works: {how_it_works_url}",
            "- Join: {join_url}",
            "",
            "Reply to this email if you want help choosing the best membership tier.",
        ].join("\n"),
    },
    CHATBOT_LEAD: {
        enabled: true,
        delayMinutes: 0,
        subjectTemplate: "Thanks for chatting with Present Health, {first_name}",
        bodyTemplate: [
            "Hi {first_name},",
            "",
            "Thanks for taking time to chat with us.",
            "",
            "Next steps:",
            "- We will follow up within 24 hours.",
            "- Review membership details:",
            "  Pricing: {pricing_url}",
            "  How it works: {how_it_works_url}",
            "  State availability: {state_page_url}",
            "",
            "Ready to join? {join_url}",
            "",
            "Warmly,",
            "{physician_name}",
            "{physician_credentials}",
        ].join("\n"),
        followUpEnabled: false,
        followUpDelayHours: 72,
        followUpSubjectTemplate: "Still interested in Present Health?",
        followUpBodyTemplate: [
            "Hi {first_name},",
            "",
            "Following up in case you still have questions about joining Present Health.",
            "",
            "You can compare plans here: {pricing_url}",
            "And start membership here: {join_url}",
        ].join("\n"),
    },
    EMPLOYER_INQUIRY: {
        enabled: true,
        delayMinutes: 0,
        subjectTemplate: "Present Health for {company_name} - Next Steps",
        bodyTemplate: [
            "Hi {first_name},",
            "",
            "Thank you for your interest in Present Health for {company_name}.",
            "",
            "We will follow up with a personalized employer proposal within 48 hours.",
            "",
            "In the meantime:",
            "- Employer overview: {for_employers_url}",
            "- State availability: {states_url}",
            "- One-pager: {employer_one_pager_url}",
            "",
            "Thanks again,",
            "Present Health",
        ].join("\n"),
        followUpEnabled: false,
        followUpDelayHours: 72,
        followUpSubjectTemplate: "Checking in on employer DPC options for {company_name}",
        followUpBodyTemplate: [
            "Hi {first_name},",
            "",
            "Checking in to see if you still want details for a Present Health employer plan.",
            "",
            "You can review the overview here: {for_employers_url}",
            "",
            "Reply anytime and we can tailor numbers for your team.",
        ].join("\n"),
    },
    STATE_WAITLIST: {
        enabled: true,
        delayMinutes: 0,
        subjectTemplate: "You're on the list, {first_name}!",
        bodyTemplate: [
            "Hi {first_name},",
            "",
            "You are now on the Present Health waitlist for {state_name}.",
            "",
            "We will notify you as soon as we open availability in your state.",
            "",
            "While you wait:",
            "- Learn more about DPC: {how_it_works_url}",
            "- Explore educational articles: {learn_url}",
            "- Browse active states: {states_url}",
        ].join("\n"),
        followUpEnabled: false,
        followUpDelayHours: 72,
        followUpSubjectTemplate: "Present Health waitlist update",
        followUpBodyTemplate: [
            "Hi {first_name},",
            "",
            "Thanks again for joining the Present Health waitlist.",
            "",
            "You can keep exploring here: {learn_url}",
        ].join("\n"),
    },
    ASSESSMENT_LEAD: {
        enabled: true,
        delayMinutes: 0,
        subjectTemplate: "Your Present Health report is ready",
        bodyTemplate: [
            "Hi {first_name},",
            "",
            "Thank you for completing the Present Health assessment.",
            "",
            "Ready to experience healthcare that actually has time for you?",
            "",
            "Present Health DPC offers same-day appointments, transparent pricing, and direct physician access.",
            "Join at: {join_url}",
        ].join("\n"),
        followUpEnabled: true,
        followUpDelayHours: 72,
        followUpSubjectTemplate: "Have you considered Direct Primary Care?",
        followUpBodyTemplate: [
            "Hi {first_name},",
            "",
            "Just checking in — have you had a chance to explore Present Health DPC?",
            "",
            "Join at: {join_url}",
        ].join("\n"),
    },
};

export type AutoResponseTemplateConfig = {
    source: AutoResponseSource;
    enabled: boolean;
    delayMinutes: number;
    subjectTemplate: string;
    bodyTemplate: string;
    followUpEnabled: boolean;
    followUpDelayHours: number;
    followUpSubjectTemplate: string;
    followUpBodyTemplate: string;
    createdAt?: string;
    updatedAt?: string;
};

export type AutoResponseTemplatePatch = {
    source: AutoResponseSource;
    enabled?: boolean;
    delayMinutes?: number;
    subjectTemplate?: string;
    bodyTemplate?: string;
    followUpEnabled?: boolean;
    followUpDelayHours?: number;
    followUpSubjectTemplate?: string | null;
    followUpBodyTemplate?: string | null;
};

export type AutoResponsePreviewInput = {
    source: AutoResponseSource;
    firstName?: string | null;
    email?: string | null;
    state?: string | null;
    companyName?: string | null;
    sourcePage?: string | null;
    subjectTemplate?: string | null;
    bodyTemplate?: string | null;
    followUp?: boolean;
};

export type AutoResponseQueueInput = {
    source: AutoResponseSource;
    leadRefType: string;
    leadRefId: string;
    email: string;
    firstName?: string | null;
    state?: string | null;
    companyName?: string | null;
    sourcePage?: string | null;
};

type TemplateData = {
    firstName: string;
    email: string;
    state: string;
    companyName: string;
    sourcePage: string;
};

type RenderedTemplate = {
    subject: string;
    bodyText: string;
    bodyHtml: string;
    unsubscribeUrl: string;
};

type SignedTokenPayload =
    | {
          v: number;
          kind: "unsubscribe";
          email: string;
          source: AutoResponseSource;
          logId: string;
          exp: number;
      }
    | {
          v: number;
          kind: "open";
          logId: string;
          exp: number;
      }
    | {
          v: number;
          kind: "click";
          logId: string;
          target: string;
          exp: number;
      };

type TemplateRenderContext = {
    first_name: string;
    email: string;
    company_name: string;
    state_name: string;
    state_slug: string;
    source_page: string;
    pricing_url: string;
    how_it_works_url: string;
    states_url: string;
    state_page_url: string;
    learn_url: string;
    join_url: string;
    for_employers_url: string;
    employer_one_pager_url: string;
    physician_name: string;
    physician_credentials: string;
    physician_photo_url: string;
    support_email: string;
    unsubscribe_url: string;
    physical_address: string;
};

function compact(value: unknown) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim();
}

function clip(value: unknown, maxLen: number) {
    return compact(value).slice(0, maxLen);
}

function cleanEmail(value: unknown) {
    return clip(value, 254).toLowerCase();
}

function clamp(value: unknown, fallback: number, min: number, max: number) {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

function toNameCase(value: string) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function deriveFirstName(email: string, preferred?: string | null) {
    const fromPreferred = clip(preferred, 80);
    if (fromPreferred) return fromPreferred;

    const local = cleanEmail(email).split("@")[0] || "";
    const token = local.split(/[._\-+]/).find(Boolean) || "";
    const safe = token.replace(/[^a-zA-Z]/g, "");
    if (!safe) return "there";
    return toNameCase(safe.slice(0, 40));
}

function firstNameFromFullName(name: string | null | undefined) {
    const safe = clip(name, 160);
    if (!safe) return "";
    return safe.split(" ")[0] || safe;
}

function getTokenSecret() {
    return (
        process.env.AUTO_RESPONSE_TOKEN_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        process.env.AUTH_SECRET ||
        process.env.ADMIN_BYPASS_TOKEN ||
        "presenthealth-auto-response-dev-secret"
    );
}

function signToken(payload: SignedTokenPayload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = crypto.createHmac("sha256", getTokenSecret()).update(encoded).digest("base64url");
    return `${encoded}.${sig}`;
}

function verifyToken(token: string): SignedTokenPayload | null {
    const raw = String(token || "").trim();
    if (!raw || !raw.includes(".")) return null;
    const [encoded, signature] = raw.split(".");
    if (!encoded || !signature) return null;

    const expected = crypto.createHmac("sha256", getTokenSecret()).update(encoded).digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

    try {
        const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedTokenPayload;
        if (!parsed || typeof parsed !== "object") return null;
        if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
        if (parsed.v !== AUTO_RESPONSE_TOKEN_VERSION) return null;
        if (parsed.kind === "unsubscribe") {
            if (!cleanEmail(parsed.email) || !parsed.logId || !parsed.source) return null;
        } else if (parsed.kind === "open") {
            if (!parsed.logId) return null;
        } else if (parsed.kind === "click") {
            if (!parsed.logId || !parsed.target) return null;
            try {
                // only allow absolute http(s) links
                const parsedUrl = new URL(parsed.target);
                if (!["https:", "http:"].includes(parsedUrl.protocol)) return null;
            } catch {
                return null;
            }
        } else {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function autoLinkText(input: string) {
    const escaped = escapeHtml(input);
    return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
        const safe = escapeHtml(url);
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
    });
}

function textToHtml(text: string) {
    const normalized = String(text || "").replace(/\r/g, "").trim();
    if (!normalized) return "<p></p>";

    const paragraphs = normalized
        .split(/\n{2,}/)
        .map((p) => `<p style="margin:0 0 12px 0;line-height:1.6;">${autoLinkText(p).replace(/\n/g, "<br />")}</p>`)
        .join("");

    return paragraphs;
}

function renderTemplateString(template: string, context: TemplateRenderContext) {
    return String(template || "").replace(/\{([a-z0-9_]+)\}/gi, (_, keyRaw) => {
        const key = String(keyRaw || "").toLowerCase() as keyof TemplateRenderContext;
        const value = context[key];
        if (value === undefined || value === null) return "";
        return String(value);
    });
}

function normalizeTemplateFromDb(row: AutoResponseTemplate | null, source: AutoResponseSource): AutoResponseTemplateConfig {
    const defaults = TEMPLATE_DEFAULTS[source];
    return {
        source,
        enabled: row?.enabled ?? defaults.enabled,
        delayMinutes: clamp(row?.delayMinutes, defaults.delayMinutes, 0, 30),
        subjectTemplate: clip(row?.subjectTemplate || defaults.subjectTemplate, 500) || defaults.subjectTemplate,
        bodyTemplate: String(row?.bodyTemplate || defaults.bodyTemplate || "").slice(0, 12000),
        followUpEnabled: row?.followUpEnabled ?? defaults.followUpEnabled,
        followUpDelayHours: clamp(row?.followUpDelayHours, defaults.followUpDelayHours, 24, 24 * 14),
        followUpSubjectTemplate:
            clip(row?.followUpSubjectTemplate || defaults.followUpSubjectTemplate, 500) || defaults.followUpSubjectTemplate,
        followUpBodyTemplate:
            String(row?.followUpBodyTemplate || defaults.followUpBodyTemplate || "").slice(0, 12000) ||
            defaults.followUpBodyTemplate,
        createdAt: row?.createdAt?.toISOString(),
        updatedAt: row?.updatedAt?.toISOString(),
    };
}

async function getTemplateConfigBySource(source: AutoResponseSource) {
    const row = await prisma.autoResponseTemplate.findUnique({ where: { source } });
    return normalizeTemplateFromDb(row, source);
}

function normalizeStateName(stateInput: string) {
    const parsed = stateFromNameOrCode(stateInput);
    if (parsed?.name) return parsed.name;
    const safe = clip(stateInput, 80);
    return safe || "your state";
}

async function getPrimaryPhysicianSignature() {
    const physician = await prisma.physician.findFirst({
        where: { isActive: true },
        orderBy: [{ createdAt: "asc" }],
        select: {
            name: true,
            credentials: true,
            photoUrl: true,
        },
    });

    return {
        physicianName: clip(physician?.name || "Present Health Physician", 120) || "Present Health Physician",
        physicianCredentials: clip(physician?.credentials || "", 120),
        physicianPhotoUrl: clip(physician?.photoUrl || "", 500),
    };
}

function getSupportEmail() {
    return (
        cleanEmail(process.env.AUTO_RESPONSE_REPLY_TO_EMAIL) ||
        cleanEmail(process.env.EMAIL_REPLY_TO) ||
        cleanEmail(process.env.REPLY_TO_EMAIL) ||
        cleanEmail(process.env.ADMIN_NOTIFY_EMAIL) ||
        "hello@presenthealthmd.com"
    );
}

function getPhysicalAddress() {
    return (
        clip(process.env.BUSINESS_PHYSICAL_ADDRESS || process.env.CAN_SPAM_ADDRESS || process.env.PRACTICE_ADDRESS, 240) ||
        "Present Health, 123 Main St, Anytown, USA"
    );
}

function defaultOnePagerUrl() {
    const explicit = clip(process.env.EMPLOYER_ONE_PAGER_URL, 500);
    if (explicit) {
        try {
            return new URL(explicit).toString();
        } catch {
            // ignore invalid env value
        }
    }
    return absoluteUrl("/for-employers");
}

function trackedClickUrl(logId: string | null, target: string) {
    if (!logId) return target;
    const token = signToken({
        v: AUTO_RESPONSE_TOKEN_VERSION,
        kind: "click",
        logId,
        target,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 120,
    });
    return absoluteUrl(`/api/auto-response/click?token=${encodeURIComponent(token)}`);
}

function trackedOpenUrl(logId: string | null) {
    if (!logId) return "";
    const token = signToken({
        v: AUTO_RESPONSE_TOKEN_VERSION,
        kind: "open",
        logId,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 120,
    });
    return absoluteUrl(`/api/auto-response/open?token=${encodeURIComponent(token)}`);
}

function unsubscribeUrl(logId: string | null, source: AutoResponseSource, email: string) {
    if (!logId) return absoluteUrl("/join");
    const token = signToken({
        v: AUTO_RESPONSE_TOKEN_VERSION,
        kind: "unsubscribe",
        logId,
        email,
        source,
        exp: Date.now() + 1000 * 60 * 60 * 24 * 365,
    });
    return absoluteUrl(`/api/auto-response/unsubscribe?token=${encodeURIComponent(token)}`);
}

async function buildTemplateContext(input: {
    source: AutoResponseSource;
    data: TemplateData;
    logId: string | null;
}) {
    const { physicianName, physicianCredentials, physicianPhotoUrl } = await getPrimaryPhysicianSignature();

    const firstName = deriveFirstName(input.data.email, input.data.firstName);
    const stateName = normalizeStateName(input.data.state);
    const normalizedStateSlug = stateSlug(input.data.state || "") || slugify(input.data.state || "");
    const statePath = normalizedStateSlug ? `/states/${normalizedStateSlug}` : "/states";

    const makeLink = (path: string) => trackedClickUrl(input.logId, absoluteUrl(path));

    return {
        first_name: firstName,
        email: input.data.email,
        company_name: clip(input.data.companyName, 160) || "your team",
        state_name: stateName,
        state_slug: normalizedStateSlug,
        source_page: clip(input.data.sourcePage, 160) || "",
        pricing_url: makeLink("/pricing"),
        how_it_works_url: makeLink("/how-it-works"),
        states_url: makeLink("/states"),
        state_page_url: makeLink(statePath),
        learn_url: makeLink("/learn"),
        join_url: makeLink("/join"),
        for_employers_url: makeLink("/for-employers"),
        employer_one_pager_url: trackedClickUrl(input.logId, defaultOnePagerUrl()),
        physician_name: physicianName,
        physician_credentials: physicianCredentials,
        physician_photo_url: physicianPhotoUrl,
        support_email: getSupportEmail(),
        unsubscribe_url: unsubscribeUrl(input.logId, input.source, input.data.email),
        physical_address: getPhysicalAddress(),
    } satisfies TemplateRenderContext;
}

async function renderEmailContent(options: {
    source: AutoResponseSource;
    template: AutoResponseTemplateConfig;
    data: TemplateData;
    logId: string | null;
    followUp: boolean;
}): Promise<RenderedTemplate> {
    const context = await buildTemplateContext({ source: options.source, data: options.data, logId: options.logId });

    const subjectTemplate =
        options.followUp && options.template.followUpEnabled
            ? options.template.followUpSubjectTemplate || options.template.subjectTemplate
            : options.template.subjectTemplate;
    const bodyTemplate =
        options.followUp && options.template.followUpEnabled
            ? options.template.followUpBodyTemplate || options.template.bodyTemplate
            : options.template.bodyTemplate;

    const subject = renderTemplateString(subjectTemplate, context).trim() || "Thanks for reaching out to Present Health";
    const bodyTextCore = renderTemplateString(bodyTemplate, context).trim();

    const footerLines = [
        "",
        "---",
        "This email is for marketing and enrollment information only.",
        "This message does not provide medical advice.",
        `Unsubscribe: ${context.unsubscribe_url}`,
        `Present Health`,
        context.physical_address,
    ];

    const bodyText = `${bodyTextCore}\n${footerLines.join("\n")}`.trim();

    let signatureHtml = "";
    if (
        (options.source === AutoResponseSourceEnum.GENERAL_CONTACT || options.source === AutoResponseSourceEnum.CHATBOT_LEAD) &&
        context.physician_name
    ) {
        signatureHtml = [
            '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">',
            context.physician_photo_url
                ? `<img src="${escapeHtml(context.physician_photo_url)}" alt="${escapeHtml(context.physician_name)}" style="width:56px;height:56px;object-fit:cover;border-radius:9999px;border:1px solid #e5e7eb;" />`
                : "",
            '<div style="font-size:13px;line-height:1.5;color:#111827;">',
            `<div style="font-weight:600;">${escapeHtml(context.physician_name)}</div>`,
            context.physician_credentials
                ? `<div>${escapeHtml(context.physician_credentials)}</div>`
                : "",
            "</div>",
            "</div>",
        ].join("");
    }

    const footerHtml = [
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0 12px 0;"/>',
        '<div style="font-size:12px;line-height:1.6;color:#4b5563;">',
        "<div>This email is for marketing and enrollment information only.</div>",
        "<div>This message does not provide medical advice.</div>",
        `<div><a href="${escapeHtml(context.unsubscribe_url)}" target="_blank" rel="noopener noreferrer">Unsubscribe</a></div>`,
        `<div>Present Health<br/>${escapeHtml(context.physical_address)}</div>`,
        "</div>",
    ].join("");

    const trackingPixel = options.logId
        ? `<img src="${escapeHtml(trackedOpenUrl(options.logId))}" alt="" width="1" height="1" style="display:block;border:0;width:1px;height:1px;" />`
        : "";

    const bodyHtml = [
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111827;">',
        textToHtml(bodyTextCore),
        signatureHtml,
        footerHtml,
        trackingPixel,
        "</div>",
    ].join("");

    return {
        subject,
        bodyText,
        bodyHtml,
        unsubscribeUrl: context.unsubscribe_url,
    };
}

function normalizeTemplateData(input: {
    firstName?: string | null;
    email: string;
    state?: string | null;
    companyName?: string | null;
    sourcePage?: string | null;
}): TemplateData {
    return {
        firstName: clip(input.firstName, 80),
        email: cleanEmail(input.email),
        state: clip(input.state, 80),
        companyName: clip(input.companyName, 160),
        sourcePage: clip(input.sourcePage, 200),
    };
}

function parseTemplateData(value: unknown): TemplateData {
    const obj = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
    return normalizeTemplateData({
        firstName: typeof obj.firstName === "string" ? obj.firstName : "",
        email: typeof obj.email === "string" ? obj.email : "",
        state: typeof obj.state === "string" ? obj.state : "",
        companyName: typeof obj.companyName === "string" ? obj.companyName : "",
        sourcePage: typeof obj.sourcePage === "string" ? obj.sourcePage : "",
    });
}

async function isUnsubscribed(email: string, source: AutoResponseSource) {
    const normalizedEmail = cleanEmail(email);
    if (!normalizedEmail) return false;

    const existing = await prisma.autoResponseUnsubscribe.findFirst({
        where: {
            email: normalizedEmail,
            OR: [{ source }, { source: null }],
        },
        select: { id: true },
    });

    return Boolean(existing?.id);
}

async function scheduleFollowUpIfEnabled(log: AutoResponseEmailLog, template: AutoResponseTemplateConfig) {
    if (log.isFollowUp) return;
    if (!template.followUpEnabled) return;

    const existing = await prisma.autoResponseEmailLog.findFirst({
        where: {
            parentEmailId: log.id,
            isFollowUp: true,
        },
        select: { id: true },
    });
    if (existing?.id) return;

    const scheduledFor = new Date(Date.now() + clamp(template.followUpDelayHours, 72, 24, 24 * 14) * 60 * 60 * 1000);

    await prisma.autoResponseEmailLog.create({
        data: {
            source: log.source,
            status: AutoResponseStatusEnum.PENDING,
            leadRefType: log.leadRefType,
            leadRefId: log.leadRefId,
            recipientEmail: log.recipientEmail,
            recipientFirstName: log.recipientFirstName,
            templateData: (log.templateData || {}) as Prisma.InputJsonValue,
            scheduledFor,
            isFollowUp: true,
            parentEmailId: log.id,
        },
    });
}

async function markLogSkipped(id: string, reason: string, status: AutoResponseStatus = AutoResponseStatusEnum.SKIPPED) {
    await prisma.autoResponseEmailLog.update({
        where: { id },
        data: {
            status,
            errorMessage: clip(reason, 1000) || null,
        },
    });
}

export async function processAutoResponseLog(logId: string) {
    const log = await prisma.autoResponseEmailLog.findUnique({ where: { id: logId } });
    if (!log) return { ok: false as const, reason: "Log not found" };
    if (log.status !== AutoResponseStatusEnum.PENDING) return { ok: false as const, reason: "Log not pending" };

    if (log.scheduledFor && log.scheduledFor.getTime() > Date.now()) {
        return { ok: false as const, reason: "Not due yet" };
    }

    if (await isUnsubscribed(log.recipientEmail, log.source)) {
        await markLogSkipped(log.id, "Recipient unsubscribed", AutoResponseStatusEnum.UNSUBSCRIBED);
        return { ok: false as const, reason: "Recipient unsubscribed" };
    }

    const template = await getTemplateConfigBySource(log.source);
    if (!template.enabled) {
        await markLogSkipped(log.id, "Template disabled", AutoResponseStatusEnum.SKIPPED);
        return { ok: false as const, reason: "Template disabled" };
    }

    if (log.isFollowUp && !template.followUpEnabled) {
        await markLogSkipped(log.id, "Follow-up disabled", AutoResponseStatusEnum.SKIPPED);
        return { ok: false as const, reason: "Follow-up disabled" };
    }

    const templateData = parseTemplateData(log.templateData);
    if (!templateData.email) templateData.email = cleanEmail(log.recipientEmail);
    if (!templateData.firstName) templateData.firstName = clip(log.recipientFirstName, 80);

    const rendered = await renderEmailContent({
        source: log.source,
        template,
        data: templateData,
        logId: log.id,
        followUp: Boolean(log.isFollowUp),
    });

    const result = await sendEmail({
        to: log.recipientEmail,
        subject: rendered.subject,
        text: rendered.bodyText,
        html: rendered.bodyHtml,
        replyTo: getSupportEmail(),
        headers: {
            "X-PresentHealth-AutoResponse": "1",
            "X-PresentHealth-AutoResponse-Source": log.source,
            "X-PresentHealth-AutoResponse-LogId": log.id,
        },
    });

    if (!result.ok) {
        await prisma.autoResponseEmailLog.update({
            where: { id: log.id },
            data: {
                status: result.skipped ? AutoResponseStatusEnum.SKIPPED : AutoResponseStatusEnum.FAILED,
                errorMessage: clip(result.reason, 1000) || null,
                subject: rendered.subject,
                bodyText: rendered.bodyText,
                bodyHtml: rendered.bodyHtml,
                unsubscribeTokenHash: hashToken(rendered.unsubscribeUrl),
            },
        });

        return {
            ok: false as const,
            reason: result.reason,
        };
    }

    const sentAt = new Date();
    await prisma.autoResponseEmailLog.update({
        where: { id: log.id },
        data: {
            status: AutoResponseStatusEnum.SENT,
            sentAt,
            subject: rendered.subject,
            bodyText: rendered.bodyText,
            bodyHtml: rendered.bodyHtml,
            provider: result.provider,
            providerMessageId: result.messageId || null,
            unsubscribeTokenHash: hashToken(rendered.unsubscribeUrl),
            errorMessage: null,
        },
    });

    await scheduleFollowUpIfEnabled(log, template);

    return {
        ok: true as const,
        sentAt,
        provider: result.provider,
    };
}

export async function processDueAutoResponses(limit = 25) {
    const safeLimit = clamp(limit, 25, 1, 200);
    const due = await prisma.autoResponseEmailLog.findMany({
        where: {
            status: AutoResponseStatusEnum.PENDING,
            OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
        },
        orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
        take: safeLimit,
        select: { id: true },
    });

    const results: Array<{ id: string; ok: boolean; reason?: string }> = [];
    for (const row of due) {
        const result = await processAutoResponseLog(row.id);
        results.push({ id: row.id, ok: Boolean(result.ok), reason: "reason" in result ? result.reason : undefined });
    }

    return {
        attempted: due.length,
        sent: results.filter((x) => x.ok).length,
        failed: results.filter((x) => !x.ok).length,
        results,
    };
}

export async function enqueueAutoResponse(input: AutoResponseQueueInput) {
    const email = cleanEmail(input.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false as const, skipped: true as const, reason: "Invalid email" };
    }

    const template = await getTemplateConfigBySource(input.source);
    const firstName = deriveFirstName(email, input.firstName || "");
    const data = normalizeTemplateData({
        firstName,
        email,
        state: input.state || "",
        companyName: input.companyName || "",
        sourcePage: input.sourcePage || "",
    });

    if (!template.enabled) {
        return { ok: false as const, skipped: true as const, reason: "Template disabled" };
    }

    if (await isUnsubscribed(email, input.source)) {
        return { ok: false as const, skipped: true as const, reason: "Recipient unsubscribed" };
    }

    const duplicate = await prisma.autoResponseEmailLog.findFirst({
        where: {
            source: input.source,
            leadRefType: clip(input.leadRefType, 60),
            leadRefId: clip(input.leadRefId, 80),
            isFollowUp: false,
            status: {
                in: [AutoResponseStatusEnum.PENDING, AutoResponseStatusEnum.SENT],
            },
        },
        select: { id: true },
    });

    if (duplicate?.id) {
        return { ok: true as const, skipped: true as const, reason: "Already queued", id: duplicate.id };
    }

    const now = Date.now();
    const scheduledFor = new Date(now + clamp(template.delayMinutes, 0, 0, 30) * 60 * 1000);

    const log = await prisma.autoResponseEmailLog.create({
        data: {
            source: input.source,
            status: AutoResponseStatusEnum.PENDING,
            leadRefType: clip(input.leadRefType, 60),
            leadRefId: clip(input.leadRefId, 80),
            recipientEmail: email,
            recipientFirstName: firstName,
            scheduledFor,
            templateData: data as Prisma.InputJsonValue,
            isFollowUp: false,
        },
    });

    if (template.delayMinutes <= 0) {
        await processAutoResponseLog(log.id);
    }

    return {
        ok: true as const,
        skipped: false as const,
        id: log.id,
        scheduledFor,
    };
}

export async function queueAutoResponseFromEmployerInquiry(inquiry: EmployerInquiry) {
    return enqueueAutoResponse({
        source: AutoResponseSourceEnum.EMPLOYER_INQUIRY,
        leadRefType: "EmployerInquiry",
        leadRefId: inquiry.id,
        email: inquiry.email,
        firstName: firstNameFromFullName(inquiry.contactName),
        companyName: inquiry.companyName,
        sourcePage: "/for-employers",
    });
}

export async function queueAutoResponseFromWaitlistSignup(signup: WaitlistSignup) {
    const firstName = deriveFirstName(signup.email, "");
    return enqueueAutoResponse({
        source: AutoResponseSourceEnum.STATE_WAITLIST,
        leadRefType: "WaitlistSignup",
        leadRefId: signup.id,
        email: signup.email,
        firstName,
        state: signup.stateInterest || "",
        sourcePage: "/states",
    });
}

export async function queueAutoResponseFromCampaignLead(
    lead: Lead,
    options?: {
        firstName?: string;
        state?: string;
        sourcePage?: string;
    }
) {
    if (!lead.email) {
        return { ok: false as const, skipped: true as const, reason: "Lead email missing" };
    }

    return enqueueAutoResponse({
        source: AutoResponseSourceEnum.GENERAL_CONTACT,
        leadRefType: "Lead",
        leadRefId: lead.id,
        email: lead.email,
        firstName: options?.firstName || "",
        state: options?.state || "",
        sourcePage: options?.sourcePage || "",
    });
}

export async function queueAutoResponseFromChatbotLead(input: {
    id: string;
    firstName: string;
    email: string;
    state?: string | null;
}) {
    return enqueueAutoResponse({
        source: AutoResponseSourceEnum.CHATBOT_LEAD,
        leadRefType: "ChatbotLead",
        leadRefId: input.id,
        email: input.email,
        firstName: input.firstName,
        state: input.state || "",
        sourcePage: "/join",
    });
}

export async function getAutoResponseTemplates() {
    const rows = await prisma.autoResponseTemplate.findMany();
    const bySource = new Map(rows.map((r) => [r.source, r]));

    return AUTO_RESPONSE_SOURCES.map((source) => normalizeTemplateFromDb(bySource.get(source) || null, source));
}

export async function upsertAutoResponseTemplates(patches: AutoResponseTemplatePatch[]) {
    for (const patchRaw of patches || []) {
        const source = patchRaw.source;
        if (!AUTO_RESPONSE_SOURCES.includes(source)) continue;

        const current = await getTemplateConfigBySource(source);

        const next: AutoResponseTemplateConfig = {
            source,
            enabled: patchRaw.enabled ?? current.enabled,
            delayMinutes: clamp(
                patchRaw.delayMinutes ?? current.delayMinutes,
                current.delayMinutes,
                0,
                30
            ),
            subjectTemplate:
                clip(patchRaw.subjectTemplate ?? current.subjectTemplate, 500) || current.subjectTemplate,
            bodyTemplate:
                String((patchRaw.bodyTemplate ?? current.bodyTemplate) || "").slice(0, 12000) ||
                current.bodyTemplate,
            followUpEnabled: patchRaw.followUpEnabled ?? current.followUpEnabled,
            followUpDelayHours: clamp(
                patchRaw.followUpDelayHours ?? current.followUpDelayHours,
                current.followUpDelayHours,
                24,
                24 * 14
            ),
            followUpSubjectTemplate:
                clip(
                    patchRaw.followUpSubjectTemplate ?? current.followUpSubjectTemplate,
                    500
                ) || current.followUpSubjectTemplate,
            followUpBodyTemplate:
                String(
                    (patchRaw.followUpBodyTemplate ?? current.followUpBodyTemplate) || ""
                ).slice(0, 12000) || current.followUpBodyTemplate,
        };

        await prisma.autoResponseTemplate.upsert({
            where: { source },
            create: {
                source,
                enabled: next.enabled,
                delayMinutes: next.delayMinutes,
                subjectTemplate: next.subjectTemplate,
                bodyTemplate: next.bodyTemplate,
                followUpEnabled: next.followUpEnabled,
                followUpDelayHours: next.followUpDelayHours,
                followUpSubjectTemplate: next.followUpSubjectTemplate,
                followUpBodyTemplate: next.followUpBodyTemplate,
            },
            update: {
                enabled: next.enabled,
                delayMinutes: next.delayMinutes,
                subjectTemplate: next.subjectTemplate,
                bodyTemplate: next.bodyTemplate,
                followUpEnabled: next.followUpEnabled,
                followUpDelayHours: next.followUpDelayHours,
                followUpSubjectTemplate: next.followUpSubjectTemplate,
                followUpBodyTemplate: next.followUpBodyTemplate,
            },
        });
    }

    return getAutoResponseTemplates();
}

export async function previewAutoResponse(input: AutoResponsePreviewInput) {
    const source = input.source;
    const config = await getTemplateConfigBySource(source);
    const email = cleanEmail(input.email || "preview@example.com") || "preview@example.com";

    const nextTemplate: AutoResponseTemplateConfig = {
        ...config,
        subjectTemplate:
            clip(input.subjectTemplate ?? config.subjectTemplate, 500) ||
            config.subjectTemplate,
        bodyTemplate:
            String((input.bodyTemplate ?? config.bodyTemplate) || "").slice(0, 12000) ||
            config.bodyTemplate,
    };

    const rendered = await renderEmailContent({
        source,
        template: nextTemplate,
        data: normalizeTemplateData({
            firstName: input.firstName || "Jordan",
            email,
            state: input.state || "Texas",
            companyName: input.companyName || "Example Co",
            sourcePage: input.sourcePage || "/join",
        }),
        logId: null,
        followUp: Boolean(input.followUp),
    });

    return rendered;
}

export async function listAutoResponseLogs(params?: {
    source?: AutoResponseSource | "ALL";
    status?: AutoResponseStatus | "ALL";
    limit?: number;
}) {
    const limit = clamp(params?.limit, 100, 1, 500);
    const where: Prisma.AutoResponseEmailLogWhereInput = {};

    if (params?.source && params.source !== "ALL") {
        where.source = params.source;
    }
    if (params?.status && params.status !== "ALL") {
        where.status = params.status;
    }

    const logs = await prisma.autoResponseEmailLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
        select: {
            id: true,
            source: true,
            status: true,
            recipientEmail: true,
            recipientFirstName: true,
            subject: true,
            provider: true,
            providerMessageId: true,
            errorMessage: true,
            scheduledFor: true,
            sentAt: true,
            openedAt: true,
            clickedAt: true,
            isFollowUp: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return logs;
}

export function parseUnsubscribeToken(token: string) {
    const payload = verifyToken(token);
    if (!payload || payload.kind !== "unsubscribe") return null;
    return payload;
}

export async function unsubscribeFromToken(token: string) {
    const payload = parseUnsubscribeToken(token);
    if (!payload) {
        return { ok: false as const, reason: "Invalid unsubscribe token" };
    }

    const email = cleanEmail(payload.email);
    if (!email) {
        return { ok: false as const, reason: "Invalid email" };
    }

    await prisma.autoResponseUnsubscribe.upsert({
        where: {
            email_source: {
                email,
                source: payload.source,
            },
        },
        create: {
            email,
            source: payload.source,
        },
        update: {
            createdAt: new Date(),
        },
    });

    await prisma.autoResponseEmailLog.updateMany({
        where: {
            recipientEmail: email,
            source: payload.source,
            status: AutoResponseStatusEnum.PENDING,
        },
        data: {
            status: AutoResponseStatusEnum.UNSUBSCRIBED,
            errorMessage: "Recipient unsubscribed",
        },
    });

    return { ok: true as const, email, source: payload.source };
}

export function parseOpenTrackingToken(token: string) {
    const payload = verifyToken(token);
    if (!payload || payload.kind !== "open") return null;
    return payload;
}

export function parseClickTrackingToken(token: string) {
    const payload = verifyToken(token);
    if (!payload || payload.kind !== "click") return null;
    return payload;
}

export async function markAutoResponseOpened(token: string) {
    const payload = parseOpenTrackingToken(token);
    if (!payload) return false;

    await prisma.autoResponseEmailLog.updateMany({
        where: { id: payload.logId },
        data: {
            openedAt: new Date(),
        },
    });

    return true;
}

export async function markAutoResponseClicked(token: string) {
    const payload = parseClickTrackingToken(token);
    if (!payload) return null;

    await prisma.autoResponseEmailLog.updateMany({
        where: { id: payload.logId },
        data: {
            clickedAt: new Date(),
        },
    });

    return payload.target;
}

export function getTrackingPixelBinary() {
    return OPEN_TRACKING_GIF;
}
