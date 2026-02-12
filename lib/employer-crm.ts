import OpenAI from "openai";
import {
    EmployerProspectSource,
    EmployerProspectStatus,
    type EmployerProspect,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS } from "@/lib/pricing";

const OUTREACH_TEMPLATE_KEY = "employers:crm_outreach_templates";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const ACTIVE_PIPELINE_STATUSES = new Set<EmployerProspectStatus>([
    EmployerProspectStatus.PROSPECT,
    EmployerProspectStatus.CONTACTED,
    EmployerProspectStatus.MEETING_SCHEDULED,
    EmployerProspectStatus.PROPOSAL_SENT,
    EmployerProspectStatus.NEGOTIATING,
]);

const STAGE_ORDER: EmployerProspectStatus[] = [
    EmployerProspectStatus.PROSPECT,
    EmployerProspectStatus.CONTACTED,
    EmployerProspectStatus.MEETING_SCHEDULED,
    EmployerProspectStatus.PROPOSAL_SENT,
    EmployerProspectStatus.NEGOTIATING,
    EmployerProspectStatus.WON,
    EmployerProspectStatus.LOST,
];

export const EMPLOYER_PROSPECT_SOURCE_LABELS: Record<EmployerProspectSource, string> = {
    MANUAL: "Manual",
    INBOUND: "Inbound",
    AI_RESEARCHED: "AI researched",
};

export const EMPLOYER_PROSPECT_STATUS_LABELS: Record<EmployerProspectStatus, string> = {
    PROSPECT: "Prospect",
    CONTACTED: "Contacted",
    MEETING_SCHEDULED: "Meeting Scheduled",
    PROPOSAL_SENT: "Proposal Sent",
    NEGOTIATING: "Negotiating",
    WON: "Won",
    LOST: "Lost",
};

export type EmployerOutreachTemplateKind =
    | "COLD_OUTREACH"
    | "WARM_OUTREACH"
    | "NO_RESPONSE_FOLLOW_UP"
    | "PROPOSAL_FOLLOW_UP"
    | "CUSTOM";

export type EmployerOutreachTemplate = {
    id: string;
    name: string;
    kind: EmployerOutreachTemplateKind;
    description?: string;
    subject: string;
    body: string;
    updatedAt?: string;
};

export type EmployerOutreachMergeFields = {
    company_name: string;
    contact_name: string;
    employee_count: string;
    estimated_annual_savings: string;
};

export type EmployerOutreachDraftResult = {
    subject: string;
    body: string;
    provider: "claude" | "openai" | "template";
    model: string;
    prompt: string;
    responseText: string;
    template: EmployerOutreachTemplate;
    mergeFields: EmployerOutreachMergeFields;
};

function compactWhitespace(value: unknown) {
    return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeOptionalString(value: unknown, maxLen = 2000) {
    const text = String(value ?? "").trim();
    if (!text) return null;
    return text.slice(0, maxLen);
}

function normalizeUrl(value: unknown) {
    const text = compactWhitespace(value);
    if (!text) return null;
    if (/^https?:\/\//i.test(text)) return text;
    return `https://${text}`;
}

function parseDate(value: unknown) {
    const text = compactWhitespace(value);
    if (!text) return null;

    const direct = new Date(text);
    if (Number.isFinite(direct.getTime())) return direct;

    const mdy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (mdy) {
        const mm = Number.parseInt(mdy[1], 10);
        const dd = Number.parseInt(mdy[2], 10);
        const yyyyRaw = Number.parseInt(mdy[3], 10);
        const yyyy = yyyyRaw < 100 ? 2000 + yyyyRaw : yyyyRaw;
        const alt = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0, 0));
        if (Number.isFinite(alt.getTime())) return alt;
    }

    return null;
}

function parseIntLoose(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    const n =
        typeof value === "number"
            ? value
            : Number.parseInt(String(value).replace(/[^0-9\-]/g, ""), 10);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

function parseFloatLoose(value: unknown) {
    if (value === null || value === undefined || value === "") return null;
    const n =
        typeof value === "number"
            ? value
            : Number.parseFloat(String(value).replace(/[^0-9\-.]/g, ""));
    if (!Number.isFinite(n)) return null;
    return n;
}

function endOfToday() {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
}

function quarterStart(date = new Date()) {
    const month = date.getMonth();
    const quarterMonth = Math.floor(month / 3) * 3;
    return new Date(Date.UTC(date.getUTCFullYear(), quarterMonth, 1, 0, 0, 0, 0));
}

function quarterEnd(date = new Date()) {
    const start = quarterStart(date);
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 0, 23, 59, 59, 999));
}

function monthStart(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function weekStartMonday(date = new Date()) {
    const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
    const day = utc.getUTCDay();
    const daysFromMonday = (day + 6) % 7;
    utc.setUTCDate(utc.getUTCDate() - daysFromMonday);
    return utc;
}

export function parseEmployerProspectSource(value: unknown): EmployerProspectSource | null {
    const raw = compactWhitespace(value).toUpperCase();
    if (!raw) return null;
    if ((Object.values(EmployerProspectSource) as string[]).includes(raw)) {
        return raw as EmployerProspectSource;
    }

    if (raw === "AI" || raw === "AI_RESEARCH") return EmployerProspectSource.AI_RESEARCHED;
    return null;
}

export function parseEmployerProspectStatus(value: unknown): EmployerProspectStatus | null {
    const raw = compactWhitespace(value).toUpperCase();
    if (!raw) return null;
    if ((Object.values(EmployerProspectStatus) as string[]).includes(raw)) {
        return raw as EmployerProspectStatus;
    }

    if (raw === "MEETING") return EmployerProspectStatus.MEETING_SCHEDULED;
    if (raw === "PROPOSAL") return EmployerProspectStatus.PROPOSAL_SENT;
    return null;
}

export function computeDealValueEstimate(estimatedEmployees: number | null | undefined) {
    if (!Number.isFinite(estimatedEmployees as number) || !estimatedEmployees || estimatedEmployees <= 0) return null;
    return Math.round(estimatedEmployees * EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS * 12);
}

export function computeEstimatedAnnualSavings(
    estimatedEmployees: number | null | undefined,
    premiumMonthly = 650,
    utilizationAnnual = 2000
) {
    if (!Number.isFinite(estimatedEmployees as number) || !estimatedEmployees || estimatedEmployees <= 0) return 0;
    const dpcAnnual = estimatedEmployees * EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS * 12;
    const traditionalAnnual = estimatedEmployees * (premiumMonthly * 12 + utilizationAnnual);
    return Math.max(0, Math.round(traditionalAnnual - dpcAnnual));
}

function defaultOutreachTemplates(): EmployerOutreachTemplate[] {
    const nowIso = new Date().toISOString();
    return [
        {
            id: "cold-outreach",
            name: "Cold outreach",
            kind: "COLD_OUTREACH",
            description: "For employers that do not currently offer Direct Primary Care.",
            subject: "A practical way to cut primary-care costs for {company_name}",
            body: [
                "Hi {contact_name},",
                "",
                "I work with Present Health, a telehealth-first Direct Primary Care practice. We help employers offer each team member messaging-first access to licensed clinicians with board-certified physician oversight, unlimited virtual visits, and no copays.",
                "",
                "For a team of about {employee_count}, we estimate potential primary-care-related savings of roughly {estimated_annual_savings} annually, while improving access and continuity of care.",
                "",
                "If helpful, I can share a one-page cost comparison and a simple rollout option.",
                "",
                "Best,",
                "Present Health",
            ].join("\n"),
            updatedAt: nowIso,
        },
        {
            id: "warm-outreach",
            name: "Warm outreach",
            kind: "WARM_OUTREACH",
            description: "For employers already offering wellness or preventative benefits.",
            subject: "Enhance your current wellness benefits at {company_name}",
            body: [
                "Hi {contact_name},",
                "",
                "Noticed that {company_name} already invests in employee wellbeing. Present Health can complement that with telehealth-first Direct Primary Care so every employee has direct access to licensed clinicians with board-certified physician oversight.",
                "",
                "For around {employee_count} employees, estimated annual savings could be about {estimated_annual_savings} while delivering faster access, continuity, and no-copay primary care.",
                "",
                "Open to a brief call to see if this fits your current benefits strategy?",
                "",
                "Best,",
                "Present Health",
            ].join("\n"),
            updatedAt: nowIso,
        },
        {
            id: "follow-up-no-response",
            name: "Follow-up after no response",
            kind: "NO_RESPONSE_FOLLOW_UP",
            description: "Use after initial outreach receives no reply.",
            subject: "Quick follow-up for {company_name}",
            body: [
                "Hi {contact_name},",
                "",
                "Quick follow-up in case my earlier note got buried.",
                "",
                "For a team of about {employee_count}, Present Health may offer around {estimated_annual_savings} in annual savings while improving primary care access through a dedicated physician model.",
                "",
                "If now is not the right time, I can check back later in the year.",
                "",
                "Best,",
                "Present Health",
            ].join("\n"),
            updatedAt: nowIso,
        },
        {
            id: "proposal-follow-up",
            name: "Proposal follow-up",
            kind: "PROPOSAL_FOLLOW_UP",
            description: "Use after sharing pricing/proposal materials.",
            subject: "Checking in on the proposal for {company_name}",
            body: [
                "Hi {contact_name},",
                "",
                "Wanted to follow up on the DPC proposal for {company_name}.",
                "",
                "Based on {employee_count} employees, projected annual savings remain around {estimated_annual_savings} compared with traditional primary-care cost patterns.",
                "",
                "Happy to walk through implementation timing, enrollment, and any open questions.",
                "",
                "Best,",
                "Present Health",
            ].join("\n"),
            updatedAt: nowIso,
        },
    ];
}

function normalizeTemplateList(value: unknown): EmployerOutreachTemplate[] {
    if (!Array.isArray(value)) return [];

    const list: EmployerOutreachTemplate[] = [];
    for (let i = 0; i < value.length; i += 1) {
        const item = value[i];
        if (!item || typeof item !== "object") continue;

        const obj = item as Record<string, unknown>;
        const kindRaw = compactWhitespace(obj.kind).toUpperCase();
        const kind: EmployerOutreachTemplateKind =
            kindRaw === "COLD_OUTREACH" ||
            kindRaw === "WARM_OUTREACH" ||
            kindRaw === "NO_RESPONSE_FOLLOW_UP" ||
            kindRaw === "PROPOSAL_FOLLOW_UP"
                ? (kindRaw as EmployerOutreachTemplateKind)
                : "CUSTOM";

        const template: EmployerOutreachTemplate = {
            id: compactWhitespace(obj.id || `template-${i + 1}`) || `template-${i + 1}`,
            name: compactWhitespace(obj.name || `Template ${i + 1}`) || `Template ${i + 1}`,
            kind,
            description: normalizeOptionalString(obj.description, 300) || undefined,
            subject: normalizeOptionalString(obj.subject, 3000) || "",
            body: normalizeOptionalString(obj.body, 15000) || "",
            updatedAt: normalizeOptionalString(obj.updatedAt, 100) || undefined,
        };

        if (!template.subject || !template.body) continue;
        list.push(template);
        if (list.length >= 40) break;
    }

    return list;
}

export async function getEmployerOutreachTemplates() {
    const row = await prisma.contentStrategy.findUnique({ where: { key: OUTREACH_TEMPLATE_KEY } });
    const stored = normalizeTemplateList((row?.value as any)?.templates);

    if (stored.length) return stored;

    const defaults = defaultOutreachTemplates();
    await prisma.contentStrategy.upsert({
        where: { key: OUTREACH_TEMPLATE_KEY },
        create: {
            key: OUTREACH_TEMPLATE_KEY,
            value: {
                templates: defaults,
                updatedAt: new Date().toISOString(),
            } as any,
        },
        update: {
            value: {
                templates: defaults,
                updatedAt: new Date().toISOString(),
            } as any,
        },
    });

    return defaults;
}

export async function upsertEmployerOutreachTemplates(input: unknown) {
    const normalized = normalizeTemplateList(input);
    if (!normalized.length) {
        throw new Error("At least one template with subject and body is required");
    }

    await prisma.contentStrategy.upsert({
        where: { key: OUTREACH_TEMPLATE_KEY },
        create: {
            key: OUTREACH_TEMPLATE_KEY,
            value: {
                templates: normalized,
                updatedAt: new Date().toISOString(),
            } as any,
        },
        update: {
            value: {
                templates: normalized,
                updatedAt: new Date().toISOString(),
            } as any,
        },
    });

    return normalized;
}

function formatUsd(value: number) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
}

export function buildOutreachMergeFields(input: {
    companyName?: string | null;
    contactName?: string | null;
    estimatedEmployees?: number | null;
    estimatedAnnualSavings?: number | null;
}) {
    const employeeCount = Number.isFinite(input.estimatedEmployees as number)
        ? Math.max(0, Math.trunc(input.estimatedEmployees as number))
        : 0;

    const savingsValue = Number.isFinite(input.estimatedAnnualSavings as number)
        ? Math.max(0, Math.round(input.estimatedAnnualSavings as number))
        : computeEstimatedAnnualSavings(employeeCount);

    const mergeFields: EmployerOutreachMergeFields = {
        company_name: compactWhitespace(input.companyName || "") || "your company",
        contact_name: compactWhitespace(input.contactName || "") || "there",
        employee_count: employeeCount > 0 ? String(employeeCount) : "your team",
        estimated_annual_savings: formatUsd(savingsValue),
    };

    return mergeFields;
}

export function renderTemplateWithMergeFields(text: string, fields: EmployerOutreachMergeFields) {
    return String(text || "")
        .replaceAll("{company_name}", fields.company_name)
        .replaceAll("{contact_name}", fields.contact_name)
        .replaceAll("{employee_count}", fields.employee_count)
        .replaceAll("{estimated_annual_savings}", fields.estimated_annual_savings);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
    const raw = String(text || "").trim();
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    } catch {
        // continue
    }

    const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
        try {
            const parsed = JSON.parse(fenced[1]);
            if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
        } catch {
            // continue
        }
    }

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
        try {
            const parsed = JSON.parse(raw.slice(start, end + 1));
            if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
        } catch {
            return null;
        }
    }

    return null;
}

function buildOutreachPrompt(input: {
    companyName: string;
    contactName?: string | null;
    employeeCount?: number | null;
    context?: string | null;
    template: EmployerOutreachTemplate;
    mergedSubject: string;
    mergedBody: string;
}) {
    return [
        "You are an outreach assistant for Present Health, a telehealth-first Direct Primary Care practice.",
        "Goal: draft a personalized employer outreach email that is concise, practical, and specific.",
        "Safety: this is marketing outreach only. Do not include diagnosis/treatment advice or medical claims.",
        "Output strict JSON only with keys: subject, body.",
        "Use plain text email format.",
        "Keep body under 220 words.",
        "",
        `Company: ${input.companyName}`,
        input.contactName ? `Contact name: ${input.contactName}` : "",
        Number.isFinite(input.employeeCount as number)
            ? `Estimated employees: ${input.employeeCount}`
            : "",
        input.context ? `Context: ${input.context}` : "",
        `Template name: ${input.template.name}`,
        `Template kind: ${input.template.kind}`,
        "",
        "Base subject (already merged):",
        input.mergedSubject,
        "",
        "Base body (already merged):",
        input.mergedBody,
        "",
        "Improve personalization while preserving the offer and key numbers.",
        "Avoid hype. Keep tone warm, professional, and direct.",
        "",
        JSON.stringify({ subject: "", body: "" }, null, 2),
    ]
        .filter(Boolean)
        .join("\n");
}

async function callClaude(prompt: string) {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) return null;

    const model = process.env.EMPLOYER_OUTREACH_ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model,
            max_tokens: 1200,
            temperature: 0.25,
            messages: [{ role: "user", content: prompt }],
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude outreach draft failed (${res.status}): ${detail || "unknown error"}`);
    }

    const data = (await res.json().catch(() => null)) as any;
    const text = Array.isArray(data?.content)
        ? data.content
              .map((part: any) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
              .join("\n")
              .trim()
        : "";

    return { model, text };
}

async function callOpenAi(prompt: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const model = process.env.EMPLOYER_OUTREACH_OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
        model,
        temperature: 0.25,
        max_tokens: 1000,
        messages: [
            {
                role: "system",
                content:
                    "You write concise B2B outreach emails. This is healthcare marketing copy, not medical advice. Return JSON only.",
            },
            { role: "user", content: prompt },
        ],
    });

    const text = response.choices[0]?.message?.content?.trim() || "";
    return { model, text };
}

export async function draftEmployerOutreachEmail(input: {
    templateId?: string | null;
    companyName: string;
    contactName?: string | null;
    estimatedEmployees?: number | null;
    context?: string | null;
    prospectId?: string | null;
}) {
    const templates = await getEmployerOutreachTemplates();
    const template =
        templates.find((item) => item.id === input.templateId) || templates[0] || defaultOutreachTemplates()[0];

    const mergeFields = buildOutreachMergeFields({
        companyName: input.companyName,
        contactName: input.contactName,
        estimatedEmployees: input.estimatedEmployees,
    });

    const mergedSubject = renderTemplateWithMergeFields(template.subject, mergeFields);
    const mergedBody = renderTemplateWithMergeFields(template.body, mergeFields);

    const prompt = buildOutreachPrompt({
        companyName: input.companyName,
        contactName: input.contactName,
        employeeCount: input.estimatedEmployees,
        context: input.context,
        template,
        mergedSubject,
        mergedBody,
    });

    try {
        const claude = await callClaude(prompt);
        if (claude?.text) {
            const parsed = parseJsonObject(claude.text);
            const subject = normalizeOptionalString(parsed?.subject, 320) || mergedSubject;
            const body = normalizeOptionalString(parsed?.body, 14000) || mergedBody;
            if (subject && body) {
                return {
                    subject,
                    body,
                    provider: "claude" as const,
                    model: claude.model,
                    prompt,
                    responseText: claude.text,
                    template,
                    mergeFields,
                } satisfies EmployerOutreachDraftResult;
            }
        }
    } catch (error) {
        console.error("[employer-crm] Claude outreach draft error", error);
    }

    try {
        const openai = await callOpenAi(prompt);
        if (openai?.text) {
            const parsed = parseJsonObject(openai.text);
            const subject = normalizeOptionalString(parsed?.subject, 320) || mergedSubject;
            const body = normalizeOptionalString(parsed?.body, 14000) || mergedBody;
            if (subject && body) {
                return {
                    subject,
                    body,
                    provider: "openai" as const,
                    model: openai.model,
                    prompt,
                    responseText: openai.text,
                    template,
                    mergeFields,
                } satisfies EmployerOutreachDraftResult;
            }
        }
    } catch (error) {
        console.error("[employer-crm] OpenAI outreach draft error", error);
    }

    return {
        subject: mergedSubject,
        body: mergedBody,
        provider: "template",
        model: "template-v1",
        prompt,
        responseText: "",
        template,
        mergeFields,
    } satisfies EmployerOutreachDraftResult;
}

function getField(payload: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        if (key in payload) return payload[key];
    }
    return undefined;
}

function normalizeProspectInput(payload: Record<string, unknown>, partial = false) {
    const companyNameRaw = getField(payload, ["companyName", "company_name"]);
    const industryRaw = getField(payload, ["industry"]);
    const estimatedEmployeesRaw = getField(payload, ["estimatedEmployees", "estimated_employees"]);
    const locationStateRaw = getField(payload, ["locationState", "location_state"]);
    const contactNameRaw = getField(payload, ["contactName", "contact_name"]);
    const contactEmailRaw = getField(payload, ["contactEmail", "contact_email", "email"]);
    const contactTitleRaw = getField(payload, ["contactTitle", "contact_title"]);
    const sourceRaw = getField(payload, ["source"]);
    const statusRaw = getField(payload, ["status"]);
    const lastContactDateRaw = getField(payload, ["lastContactDate", "last_contact_date"]);
    const nextFollowUpDateRaw = getField(payload, ["nextFollowUpDate", "next_follow_up_date"]);
    const notesRaw = getField(payload, ["notes"]);
    const dealValueRaw = getField(payload, ["dealValueEstimate", "deal_value_estimate"]);

    const companyName = normalizeOptionalString(companyNameRaw, 200);
    if (!partial && !companyName) {
        throw new Error("company_name is required");
    }

    const sourceParsed = parseEmployerProspectSource(sourceRaw);
    if (sourceRaw !== undefined && sourceRaw !== null && sourceRaw !== "" && !sourceParsed) {
        throw new Error(
            `source must be one of ${Object.values(EmployerProspectSource).join(", ")}`
        );
    }

    const statusParsed = parseEmployerProspectStatus(statusRaw);
    if (statusRaw !== undefined && statusRaw !== null && statusRaw !== "" && !statusParsed) {
        throw new Error(
            `status must be one of ${Object.values(EmployerProspectStatus).join(", ")}`
        );
    }

    const estimatedEmployeesParsed = parseIntLoose(estimatedEmployeesRaw);
    const dealValueParsed = parseIntLoose(dealValueRaw);

    const lastContactDateParsed =
        lastContactDateRaw === undefined
            ? undefined
            : lastContactDateRaw === null || String(lastContactDateRaw).trim() === ""
                ? null
                : parseDate(lastContactDateRaw);

    const nextFollowUpDateParsed =
        nextFollowUpDateRaw === undefined
            ? undefined
            : nextFollowUpDateRaw === null || String(nextFollowUpDateRaw).trim() === ""
                ? null
                : parseDate(nextFollowUpDateRaw);

    if (lastContactDateRaw !== undefined && lastContactDateRaw !== null && String(lastContactDateRaw).trim() && !lastContactDateParsed) {
        throw new Error("Invalid last_contact_date");
    }

    if (nextFollowUpDateRaw !== undefined && nextFollowUpDateRaw !== null && String(nextFollowUpDateRaw).trim() && !nextFollowUpDateParsed) {
        throw new Error("Invalid next_follow_up_date");
    }

    const normalized: any = {};
    if (!partial || companyNameRaw !== undefined) normalized.companyName = companyName;
    if (!partial || industryRaw !== undefined) normalized.industry = normalizeOptionalString(industryRaw, 120);
    if (!partial || estimatedEmployeesRaw !== undefined) normalized.estimatedEmployees = estimatedEmployeesParsed;
    if (!partial || locationStateRaw !== undefined) normalized.locationState = normalizeOptionalString(locationStateRaw, 64);
    if (!partial || contactNameRaw !== undefined) normalized.contactName = normalizeOptionalString(contactNameRaw, 160);
    if (!partial || contactEmailRaw !== undefined) normalized.contactEmail = normalizeOptionalString(contactEmailRaw, 254);
    if (!partial || contactTitleRaw !== undefined) normalized.contactTitle = normalizeOptionalString(contactTitleRaw, 160);
    if (!partial || sourceRaw !== undefined) normalized.source = sourceParsed || EmployerProspectSource.MANUAL;
    if (!partial || statusRaw !== undefined) normalized.status = statusParsed || EmployerProspectStatus.PROSPECT;
    if (!partial || lastContactDateRaw !== undefined) normalized.lastContactDate = lastContactDateParsed;
    if (!partial || nextFollowUpDateRaw !== undefined) normalized.nextFollowUpDate = nextFollowUpDateParsed;
    if (!partial || notesRaw !== undefined) normalized.notes = normalizeOptionalString(notesRaw, 10000);

    if (!partial || dealValueRaw !== undefined || estimatedEmployeesRaw !== undefined) {
        normalized.dealValueEstimate = dealValueParsed ?? computeDealValueEstimate(estimatedEmployeesParsed);
    }

    return normalized;
}

export async function createEmployerProspect(payload: Record<string, unknown>) {
    const data = normalizeProspectInput(payload, false);
    return prisma.employerProspect.create({ data });
}

export async function updateEmployerProspect(id: string, payload: Record<string, unknown>) {
    const data = normalizeProspectInput(payload, true);
    return prisma.employerProspect.update({ where: { id }, data });
}

export async function deleteEmployerProspect(id: string) {
    return prisma.employerProspect.delete({ where: { id } });
}

function parseCsvRows(csvText: string) {
    const rows: string[][] = [];
    let row: string[] = [];
    let current = "";
    let inQuotes = false;

    const text = String(csvText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                current += '"';
                i += 1;
                continue;
            }
            if (char === '"') {
                inQuotes = false;
                continue;
            }
            current += char;
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === ",") {
            row.push(current);
            current = "";
            continue;
        }

        if (char === "\n") {
            row.push(current);
            rows.push(row);
            row = [];
            current = "";
            continue;
        }

        current += char;
    }

    row.push(current);
    if (row.length > 1 || row[0].trim()) rows.push(row);

    return rows.map((r) => r.map((cell) => cell.trim()));
}

function normalizeHeader(value: string) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function headerIndexMap(headers: string[]) {
    const map = new Map<string, number>();
    headers.forEach((header, index) => {
        map.set(normalizeHeader(header), index);
    });
    return map;
}

function csvCell(row: string[], indexMap: Map<string, number>, keys: string[]) {
    for (const key of keys) {
        const idx = indexMap.get(key);
        if (idx === undefined) continue;
        return row[idx] ?? "";
    }
    return "";
}

export async function importEmployerProspectsFromCsv(input: {
    csvText: string;
    defaultSource?: EmployerProspectSource;
}) {
    const rows = parseCsvRows(input.csvText || "");
    if (rows.length < 2) {
        return { createdCount: 0, errors: ["CSV must include a header row and at least one data row."] };
    }

    const headers = rows[0];
    const indexMap = headerIndexMap(headers);
    const records: any[] = [];
    const errors: string[] = [];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const companyName = csvCell(row, indexMap, ["company_name", "company", "companyname"]);

        if (!compactWhitespace(companyName)) {
            errors.push(`Row ${rowIndex + 1}: company_name is required.`);
            continue;
        }

        const payload: Record<string, unknown> = {
            companyName,
            industry: csvCell(row, indexMap, ["industry"]),
            estimatedEmployees: csvCell(row, indexMap, ["estimated_employees", "employees", "employee_count"]),
            locationState: csvCell(row, indexMap, ["location_state", "state"]),
            contactName: csvCell(row, indexMap, ["contact_name"]),
            contactEmail: csvCell(row, indexMap, ["contact_email", "email"]),
            contactTitle: csvCell(row, indexMap, ["contact_title", "title"]),
            source:
                csvCell(row, indexMap, ["source"]) || input.defaultSource || EmployerProspectSource.MANUAL,
            status: csvCell(row, indexMap, ["status"]) || EmployerProspectStatus.PROSPECT,
            lastContactDate: csvCell(row, indexMap, ["last_contact_date"]),
            nextFollowUpDate: csvCell(row, indexMap, ["next_follow_up_date"]),
            notes: csvCell(row, indexMap, ["notes"]),
            dealValueEstimate: csvCell(row, indexMap, ["deal_value_estimate"]),
        };

        try {
            records.push(normalizeProspectInput(payload, false));
        } catch (error: any) {
            errors.push(`Row ${rowIndex + 1}: ${error?.message || "invalid row"}`);
        }
    }

    if (!records.length) {
        return { createdCount: 0, errors };
    }

    const result = await prisma.employerProspect.createMany({ data: records });
    return {
        createdCount: result.count,
        errors,
    };
}

export async function listEmployerProspects(filters?: {
    q?: string | null;
    status?: EmployerProspectStatus | null;
    source?: EmployerProspectSource | null;
    state?: string | null;
    dueOnly?: boolean;
    page?: number;
    pageSize?: number;
}) {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;

    const state = compactWhitespace(filters?.state || "");
    if (state) where.locationState = { equals: state, mode: "insensitive" };

    const q = compactWhitespace(filters?.q || "");
    if (q) {
        where.OR = [
            { companyName: { contains: q, mode: "insensitive" } },
            { industry: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
        ];
    }

    if (filters?.dueOnly) {
        where.nextFollowUpDate = { lte: endOfToday() };
        where.status = { in: Array.from(ACTIVE_PIPELINE_STATUSES) };
    }

    const page = Math.max(1, Math.min(5000, Math.trunc(filters?.page || 1)));
    const pageSize = Math.max(10, Math.min(250, Math.trunc(filters?.pageSize || 100)));
    const skip = (page - 1) * pageSize;

    const [total, prospects] = await prisma.$transaction([
        prisma.employerProspect.count({ where }),
        prisma.employerProspect.findMany({
            where,
            orderBy: [
                { nextFollowUpDate: { sort: "asc", nulls: "last" } },
                { updatedAt: "desc" },
            ],
            skip,
            take: pageSize,
        }),
    ]);

    return { total, page, pageSize, prospects };
}

export async function getEmployerProspectById(id: string) {
    return prisma.employerProspect.findUnique({ where: { id } });
}

export async function getEmployerPipelineDashboard() {
    const prospects = await prisma.employerProspect.findMany({
        orderBy: [
            { status: "asc" },
            { nextFollowUpDate: { sort: "asc", nulls: "last" } },
            { updatedAt: "desc" },
        ],
    });

    const now = new Date();
    const qStart = quarterStart(now);
    const qEnd = quarterEnd(now);
    const mStart = monthStart(now);
    const wStart = weekStartMonday(now);
    const dueCutoff = endOfToday();

    const outreachTargetWeekly = 30;
    const meetingsTargetMonthly = 8;
    const proposalsTargetMonthly = 4;

    const counts = new Map<EmployerProspectStatus, number>();
    for (const status of STAGE_ORDER) counts.set(status, 0);

    let pipelineValue = 0;
    let wonThisQuarter = 0;
    let dueFollowUps = 0;
    let outreachThisWeek = 0;
    let meetingsThisMonth = 0;
    let proposalsThisMonth = 0;

    for (const prospect of prospects) {
        counts.set(prospect.status, (counts.get(prospect.status) || 0) + 1);

        if (ACTIVE_PIPELINE_STATUSES.has(prospect.status)) {
            pipelineValue += prospect.dealValueEstimate || computeDealValueEstimate(prospect.estimatedEmployees) || 0;

            if (prospect.nextFollowUpDate && prospect.nextFollowUpDate <= dueCutoff) {
                dueFollowUps += 1;
            }
        }

        if (
            prospect.status === EmployerProspectStatus.WON &&
            prospect.updatedAt >= qStart &&
            prospect.updatedAt <= qEnd
        ) {
            wonThisQuarter += 1;
        }

        if (prospect.lastContactDate && prospect.lastContactDate >= wStart && prospect.lastContactDate <= now) {
            outreachThisWeek += 1;
        }

        const meetingStatuses: EmployerProspectStatus[] = [
            EmployerProspectStatus.MEETING_SCHEDULED,
            EmployerProspectStatus.PROPOSAL_SENT,
            EmployerProspectStatus.NEGOTIATING,
            EmployerProspectStatus.WON,
        ];
        if (
            prospect.updatedAt >= mStart &&
            prospect.updatedAt <= now &&
            meetingStatuses.includes(prospect.status)
        ) {
            meetingsThisMonth += 1;
        }

        const proposalStatuses: EmployerProspectStatus[] = [
            EmployerProspectStatus.PROPOSAL_SENT,
            EmployerProspectStatus.NEGOTIATING,
            EmployerProspectStatus.WON,
        ];
        if (
            prospect.updatedAt >= mStart &&
            prospect.updatedAt <= now &&
            proposalStatuses.includes(prospect.status)
        ) {
            proposalsThisMonth += 1;
        }
    }

    const conversionByStage = [
        [EmployerProspectStatus.PROSPECT, EmployerProspectStatus.CONTACTED],
        [EmployerProspectStatus.CONTACTED, EmployerProspectStatus.MEETING_SCHEDULED],
        [EmployerProspectStatus.MEETING_SCHEDULED, EmployerProspectStatus.PROPOSAL_SENT],
        [EmployerProspectStatus.PROPOSAL_SENT, EmployerProspectStatus.NEGOTIATING],
        [EmployerProspectStatus.NEGOTIATING, EmployerProspectStatus.WON],
    ].map(([from, to]) => {
        const fromCount = counts.get(from) || 0;
        const toCount = counts.get(to) || 0;
        return {
            from,
            to,
            fromLabel: EMPLOYER_PROSPECT_STATUS_LABELS[from],
            toLabel: EMPLOYER_PROSPECT_STATUS_LABELS[to],
            fromCount,
            toCount,
            rate: fromCount > 0 ? toCount / fromCount : 0,
        };
    });

    const reminders = prospects
        .filter(
            (prospect) =>
                ACTIVE_PIPELINE_STATUSES.has(prospect.status) &&
                prospect.nextFollowUpDate &&
                prospect.nextFollowUpDate <= dueCutoff
        )
        .sort(
            (a, b) =>
                (a.nextFollowUpDate?.getTime() || Number.MAX_SAFE_INTEGER) -
                (b.nextFollowUpDate?.getTime() || Number.MAX_SAFE_INTEGER)
        )
        .slice(0, 40);

    return {
        generatedAt: new Date().toISOString(),
        totals: {
            totalProspects: prospects.length,
            activeProspects: prospects.filter((p) => ACTIVE_PIPELINE_STATUSES.has(p.status)).length,
            pipelineValue,
            wonThisQuarter,
            dueFollowUps,
            overallWinRate: prospects.length
                ? prospects.filter((p) => p.status === EmployerProspectStatus.WON).length / prospects.length
                : 0,
        },
        stageCounts: STAGE_ORDER.map((status) => ({
            status,
            label: EMPLOYER_PROSPECT_STATUS_LABELS[status],
            count: counts.get(status) || 0,
        })),
        conversionByStage,
        reminders,
        cadence: {
            weekStart: wStart.toISOString(),
            monthStart: mStart.toISOString(),
            outreachTargetWeekly,
            outreachThisWeek,
            meetingsTargetMonthly,
            meetingsThisMonth,
            proposalsTargetMonthly,
            proposalsThisMonth,
            outreachProgress: outreachTargetWeekly > 0 ? outreachThisWeek / outreachTargetWeekly : 0,
            meetingsProgress: meetingsTargetMonthly > 0 ? meetingsThisMonth / meetingsTargetMonthly : 0,
            proposalsProgress: proposalsTargetMonthly > 0 ? proposalsThisMonth / proposalsTargetMonthly : 0,
        },
    };
}

export async function getEmployerFollowUpReminderSummary(limit = 8) {
    const dueCutoff = endOfToday();
    const where = {
        status: { in: Array.from(ACTIVE_PIPELINE_STATUSES) },
        nextFollowUpDate: { lte: dueCutoff },
    } as const;

    const [count, reminders] = await prisma.$transaction([
        prisma.employerProspect.count({ where }),
        prisma.employerProspect.findMany({
            where,
            orderBy: [{ nextFollowUpDate: "asc" }, { updatedAt: "desc" }],
            take: Math.max(1, Math.min(50, Math.trunc(limit || 8))),
            select: {
                id: true,
                companyName: true,
                contactName: true,
                status: true,
                nextFollowUpDate: true,
                estimatedEmployees: true,
                dealValueEstimate: true,
            },
        }),
    ]);

    return {
        count,
        reminders,
    };
}

export const employerProspectEnums = {
    source: Object.values(EmployerProspectSource),
    status: Object.values(EmployerProspectStatus),
};

export type EmployerProspectListItem = EmployerProspect;

export function buildProposalShareLink(input: {
    baseUrl: string;
    companyName?: string | null;
    estimatedEmployees?: number | null;
}) {
    const url = new URL("/for-employers", input.baseUrl);
    if (input.companyName) url.searchParams.set("company", input.companyName);
    if (input.estimatedEmployees && input.estimatedEmployees > 0) {
        url.searchParams.set("employees", String(Math.trunc(input.estimatedEmployees)));
    }
    return url.toString();
}

export function parseStateFilter(value: unknown) {
    const text = compactWhitespace(value);
    if (!text) return null;
    return text.toUpperCase().slice(0, 40);
}

export function parseProspectSourceFilter(value: unknown) {
    const text = compactWhitespace(value);
    if (!text || text.toUpperCase() === "ALL") return null;
    return parseEmployerProspectSource(text);
}

export function parseProspectStatusFilter(value: unknown) {
    const text = compactWhitespace(value);
    if (!text || text.toUpperCase() === "ALL") return null;
    return parseEmployerProspectStatus(text);
}

export function clampInt(value: unknown, fallback: number, min: number, max: number) {
    const n =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number.parseInt(value, 10)
                : NaN;

    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function calculateProspectSavingsFromInput(payload: Record<string, unknown>) {
    const employees = parseFloatLoose(payload.estimatedEmployees ?? payload.estimated_employees);
    if (!Number.isFinite(employees as number)) return null;
    return computeEstimatedAnnualSavings(Math.round(employees as number));
}

export function maybeNormalizeEmail(value: unknown) {
    const email = normalizeOptionalString(value, 254);
    return email ? email.toLowerCase() : null;
}

export function maybeNormalizeWebUrl(value: unknown) {
    return normalizeUrl(value);
}
