import nodemailer from "nodemailer";

export type SendEmailOptions = {
    to: string;
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    headers?: Record<string, string>;
};

export type SendEmailResult =
    | {
        ok: true;
        skipped: false;
        provider: "smtp" | "sendgrid" | "postmark";
        messageId?: string;
        statusCode?: number;
    }
    | {
        ok: false;
        skipped: true;
        reason: string;
    }
    | {
        ok: false;
        skipped: false;
        reason: string;
        provider?: "smtp" | "sendgrid" | "postmark";
        statusCode?: number;
    };

function parseBool(value: string | undefined) {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return null;
    if (v === "1" || v === "true" || v === "yes") return true;
    if (v === "0" || v === "false" || v === "no") return false;
    return null;
}

function compact(value: string | undefined) {
    return String(value || "").trim();
}

function errorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function getReplyToAddress(options: SendEmailOptions) {
    const fromOptions = compact(options.replyTo);
    if (fromOptions) return fromOptions;

    const fromEnv = compact(process.env.EMAIL_REPLY_TO || process.env.REPLY_TO_EMAIL);
    if (fromEnv) return fromEnv;
    return undefined;
}

function getFromAddress() {
    const from =
        compact(process.env.EMAIL_FROM) ||
        compact(process.env.SENDGRID_FROM_EMAIL) ||
        compact(process.env.POSTMARK_FROM_EMAIL) ||
        compact(process.env.SMTP_FROM) ||
        compact(process.env.SMTP_USER);
    return from;
}

function getTransport() {
    const host = process.env.SMTP_HOST;
    const portRaw = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) return null;

    const port = portRaw ? Number.parseInt(portRaw, 10) : 587;
    const secure = parseBool(process.env.SMTP_SECURE) ?? port === 465;

    return nodemailer.createTransport({
        host,
        port: Number.isFinite(port) ? port : 587,
        secure,
        auth: { user, pass },
    });
}

function resolveProvider() {
    const explicit = compact(process.env.EMAIL_PROVIDER).toLowerCase();
    if (explicit === "sendgrid") return "sendgrid" as const;
    if (explicit === "postmark") return "postmark" as const;
    if (explicit === "smtp") return "smtp" as const;

    if (compact(process.env.SENDGRID_API_KEY)) return "sendgrid" as const;
    if (compact(process.env.POSTMARK_API_KEY)) return "postmark" as const;
    if (getTransport()) return "smtp" as const;
    return null;
}

function emailSendingDisabledForEnvironment() {
    if (process.env.NODE_ENV === "test") return true;
    if (process.env.NODE_ENV === "development") {
        return parseBool(process.env.EMAIL_SEND_IN_DEV) !== true;
    }
    return false;
}

async function sendViaSmtp(options: SendEmailOptions): Promise<SendEmailResult> {
    const transport = getTransport();
    if (!transport) {
        return {
            ok: false,
            skipped: true,
            reason: "Missing SMTP_HOST/SMTP_USER/SMTP_PASS",
        };
    }

    const from = getFromAddress();
    if (!from) {
        return {
            ok: false,
            skipped: true,
            reason: "Missing SMTP_FROM/SMTP_USER (or EMAIL_FROM)",
        };
    }

    try {
        const info = await transport.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            replyTo: getReplyToAddress(options),
            headers: options.headers,
        });

        return {
            ok: true,
            skipped: false,
            provider: "smtp",
            messageId: typeof info?.messageId === "string" ? info.messageId : undefined,
        };
    } catch (error) {
        return {
            ok: false,
            skipped: false,
            provider: "smtp",
            reason: errorMessage(error, "SMTP send failed"),
        };
    }
}

async function sendViaSendGrid(options: SendEmailOptions): Promise<SendEmailResult> {
    const apiKey = compact(process.env.SENDGRID_API_KEY);
    if (!apiKey) {
        return {
            ok: false,
            skipped: true,
            reason: "Missing SENDGRID_API_KEY",
        };
    }

    const from = getFromAddress();
    if (!from) {
        return {
            ok: false,
            skipped: true,
            reason: "Missing EMAIL_FROM/SENDGRID_FROM_EMAIL",
        };
    }

    try {
        const replyTo = getReplyToAddress(options);
        const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: options.to }], subject: options.subject }],
                from: { email: from },
                reply_to: replyTo
                    ? {
                        email: replyTo,
                    }
                    : undefined,
                content: [
                    ...(options.text ? [{ type: "text/plain", value: options.text }] : []),
                    ...(options.html ? [{ type: "text/html", value: options.html }] : []),
                ],
                headers: options.headers,
            }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            return {
                ok: false,
                skipped: false,
                provider: "sendgrid",
                statusCode: res.status,
                reason: `SendGrid send failed (${res.status}): ${body.slice(0, 500)}`,
            };
        }

        return {
            ok: true,
            skipped: false,
            provider: "sendgrid",
            statusCode: res.status,
            messageId: res.headers.get("x-message-id") || undefined,
        };
    } catch (error) {
        return {
            ok: false,
            skipped: false,
            provider: "sendgrid",
            reason: errorMessage(error, "SendGrid send failed"),
        };
    }
}

async function sendViaPostmark(options: SendEmailOptions): Promise<SendEmailResult> {
    const apiKey = compact(process.env.POSTMARK_API_KEY);
    if (!apiKey) {
        return {
            ok: false,
            skipped: true,
            reason: "Missing POSTMARK_API_KEY",
        };
    }

    const from = getFromAddress();
    if (!from) {
        return {
            ok: false,
            skipped: true,
            reason: "Missing EMAIL_FROM/POSTMARK_FROM_EMAIL",
        };
    }

    try {
        const res = await fetch("https://api.postmarkapp.com/email", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": apiKey,
            },
            body: JSON.stringify({
                From: from,
                To: options.to,
                Subject: options.subject,
                TextBody: options.text,
                HtmlBody: options.html,
                ReplyTo: getReplyToAddress(options),
                Headers: Object.entries(options.headers || {}).map(([Name, Value]) => ({ Name, Value })),
            }),
        });

        const responseBody = await res.json().catch(() => null);
        if (!res.ok) {
            return {
                ok: false,
                skipped: false,
                provider: "postmark",
                statusCode: res.status,
                reason:
                    (typeof responseBody?.Message === "string" && responseBody.Message) ||
                    `Postmark send failed (${res.status})`,
            };
        }

        return {
            ok: true,
            skipped: false,
            provider: "postmark",
            statusCode: res.status,
            messageId: typeof responseBody?.MessageID === "string" ? responseBody.MessageID : undefined,
        };
    } catch (error) {
        return {
            ok: false,
            skipped: false,
            provider: "postmark",
            reason: errorMessage(error, "Postmark send failed"),
        };
    }
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (emailSendingDisabledForEnvironment()) {
        console.warn("[Email] Real email sends are disabled in dev/test.");
        console.log(`[Email Fallback] To: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text}`);

        return {
            ok: false,
            skipped: true,
            reason: "Email sends disabled in dev/test.",
        };
    }

    const provider = resolveProvider();
    if (!provider) {
        // GCP Native Alert Fallback: If no provider is configured, we still want the [LEAD-CAPTURE] 
        // logs to be emitted (which is handled in notify.ts) and captured by Cloud Monitoring.
        console.warn(`[Email] No provider configured. Ensuring content is logged for native GCP alerts.`);
        console.log(`[Email Fallback] To: ${options.to}\nSubject: ${options.subject}\nContent:\n${options.text}`);

        return {
            ok: false,
            skipped: true,
            reason: "Missing email provider config. Logged for GCP Alert Policy.",
        };
    }

    if (provider === "sendgrid") return sendViaSendGrid(options);
    if (provider === "postmark") return sendViaPostmark(options);
    return sendViaSmtp(options);
}
