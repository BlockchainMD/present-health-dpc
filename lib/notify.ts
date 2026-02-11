import type { ChatbotLead, EmployerInquiry } from "@prisma/client";
import { sendEmail } from "@/lib/email";

function formatInquiryText(inquiry: EmployerInquiry) {
    const lines = [
        `New employer inquiry received`,
        ``,
        `Company: ${inquiry.companyName}`,
        `Contact: ${inquiry.contactName}`,
        `Email: ${inquiry.email}`,
        `Phone: ${inquiry.phone || "(not provided)"}`,
        `Employee count: ${typeof inquiry.employeeCount === "number" ? inquiry.employeeCount : "(not provided)"}`,
        `Employee count range: ${inquiry.employeeCountRange || "(not provided)"}`,
        `Submitted at: ${inquiry.submittedAt.toISOString()}`,
        ``,
        `Message:`,
        inquiry.message ? inquiry.message : "(not provided)",
        ``,
        `Admin link: /admin/employers/inquiries`,
    ];
    return lines.join("\n");
}

export async function notifyEmployerInquiry(inquiry: EmployerInquiry) {
    const to = process.env.EMPLOYER_INQUIRIES_NOTIFY_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || "";
    if (!to) {
        return { ok: false as const, skipped: true as const, reason: "Missing EMPLOYER_INQUIRIES_NOTIFY_EMAIL (or ADMIN_NOTIFY_EMAIL)" };
    }

    const subject = `New Employer Inquiry: ${inquiry.companyName}`;
    const text = formatInquiryText(inquiry);

    return sendEmail({ to, subject, text });
}

function formatChatbotLeadText(lead: ChatbotLead) {
    const lines = [
        "New chatbot lead captured",
        "",
        `First name: ${lead.firstName}`,
        `Email: ${lead.email}`,
        `State: ${lead.state}`,
        `How they heard about us: ${lead.heardAboutUs || "(not provided)"}`,
        `Source: ${lead.source}`,
        `Created at: ${lead.createdAt.toISOString()}`,
        "",
        "Conversation summary:",
        lead.conversationSummary || "(not provided)",
        "",
        "Admin links:",
        "- /admin/chatbot/leads",
        "- /admin/chatbot/logs",
    ];
    return lines.join("\n");
}

export async function notifyChatbotLead(lead: ChatbotLead) {
    const to = process.env.CHATBOT_LEADS_NOTIFY_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || "";
    if (!to) {
        return { ok: false as const, skipped: true as const, reason: "Missing CHATBOT_LEADS_NOTIFY_EMAIL (or ADMIN_NOTIFY_EMAIL)" };
    }

    const subject = `New Chatbot Lead: ${lead.firstName} (${lead.state})`;
    const text = formatChatbotLeadText(lead);
    return sendEmail({ to, subject, text });
}

type UnifiedLeadNotificationInput = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    state: string | null;
    source: string;
    sourcePage: string | null;
    status: string;
    createdAt: Date;
    sourceMeta?: unknown;
};

export async function notifyUnifiedLeadCreated(lead: UnifiedLeadNotificationInput) {
    const to = process.env.LEADS_NOTIFY_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || "";
    if (!to) {
        return { ok: false as const, skipped: true as const, reason: "Missing LEADS_NOTIFY_EMAIL (or ADMIN_NOTIFY_EMAIL)" };
    }

    const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
    const sourceMetaText =
        lead.sourceMeta && typeof lead.sourceMeta === "object"
            ? JSON.stringify(lead.sourceMeta, null, 2)
            : "(not provided)";

    const lines = [
        "New unified lead captured",
        "",
        `Name: ${fullName || "(not provided)"}`,
        `Email: ${lead.email}`,
        `Phone: ${lead.phone || "(not provided)"}`,
        `State: ${lead.state || "(not provided)"}`,
        `Source: ${lead.source}`,
        `Source page: ${lead.sourcePage || "(not provided)"}`,
        `Status: ${lead.status}`,
        `Created at: ${lead.createdAt.toISOString()}`,
        "",
        "Source metadata:",
        sourceMetaText,
        "",
        "Admin link:",
        "- /admin/leads",
    ];

    const subject = `New Lead: ${fullName || lead.email} (${lead.source})`;
    return sendEmail({ to, subject, text: lines.join("\n") });
}

type StaleLeadDigestRow = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    state: string | null;
    source: string;
    status: string;
    statusUpdatedAt: Date;
    createdAt: Date;
};

export async function notifyStaleLeadDigest(rows: StaleLeadDigestRow[]) {
    const to = process.env.LEADS_NOTIFY_EMAIL || process.env.ADMIN_NOTIFY_EMAIL || "";
    if (!to) {
        return { ok: false as const, skipped: true as const, reason: "Missing LEADS_NOTIFY_EMAIL (or ADMIN_NOTIFY_EMAIL)" };
    }

    if (!rows.length) {
        return { ok: false as const, skipped: true as const, reason: "No stale leads provided" };
    }

    const bodyRows = rows.map((row, index) => {
        const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || "(name not provided)";
        return [
            `${index + 1}. ${fullName}`,
            `   Email: ${row.email}`,
            `   State: ${row.state || "(not provided)"}`,
            `   Source: ${row.source}`,
            `   Status: ${row.status}`,
            `   Status updated: ${row.statusUpdatedAt.toISOString()}`,
            `   Created: ${row.createdAt.toISOString()}`,
            `   Lead ID: ${row.id}`,
        ].join("\n");
    });

    const lines = [
        `Stale lead alert: ${rows.length} lead${rows.length === 1 ? "" : "s"} need follow-up`,
        "",
        ...bodyRows,
        "",
        "Admin link:",
        "- /admin/leads",
    ];

    const subject = `Stale Lead Alert (${rows.length})`;
    return sendEmail({ to, subject, text: lines.join("\n") });
}
