import crypto from "node:crypto";

import { sendEmail } from "./email.ts";
import { absoluteUrl } from "./site-url.ts";

const MEMBER_ACTIVATION_TOKEN_VERSION = 1;
const MEMBER_ACTIVATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type MemberActivationTokenPayload = {
    v: number;
    email: string;
    sessionId: string;
    exp: number;
};

function getMemberActivationSecret() {
    return String(process.env.MEMBER_ACTIVATION_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
}

function encodePayload(payload: MemberActivationTokenPayload) {
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string) {
    try {
        const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        if (!parsed || typeof parsed !== "object") return null;
        return parsed as Partial<MemberActivationTokenPayload>;
    } catch {
        return null;
    }
}

function signPayload(encodedPayload: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function firstNameFromEmail(email: string) {
    const local = String(email || "").split("@")[0] || "";
    const raw = local.split(/[._\-+]/).find(Boolean) || "there";
    const cleaned = raw.replace(/[^a-zA-Z]/g, "");
    if (!cleaned) return "there";
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function createMemberActivationToken(input: { email: string; sessionId: string; expiresInMs?: number }) {
    const secret = getMemberActivationSecret();
    if (!secret) {
        throw new Error("Missing MEMBER_ACTIVATION_SECRET or NEXTAUTH_SECRET");
    }

    const payload: MemberActivationTokenPayload = {
        v: MEMBER_ACTIVATION_TOKEN_VERSION,
        email: String(input.email || "").trim().toLowerCase(),
        sessionId: String(input.sessionId || "").trim(),
        exp: Date.now() + (input.expiresInMs || MEMBER_ACTIVATION_TTL_MS),
    };

    const encoded = encodePayload(payload);
    const signature = signPayload(encoded, secret);
    return `${encoded}.${signature}`;
}

export function parseMemberActivationToken(token: string) {
    const secret = getMemberActivationSecret();
    const raw = String(token || "").trim();
    if (!secret || !raw || !raw.includes(".")) return null;

    const [encoded, signature] = raw.split(".", 2);
    if (!encoded || !signature) return null;

    const expected = signPayload(encoded, secret);
    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== signatureBuffer.length) return null;
    if (!crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

    const payload = decodePayload(encoded);
    if (!payload) return null;
    if (payload.v !== MEMBER_ACTIVATION_TOKEN_VERSION) return null;
    if (typeof payload.email !== "string" || !payload.email.trim()) return null;
    if (typeof payload.sessionId !== "string" || !payload.sessionId.trim()) return null;
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp < Date.now()) return null;

    return {
        email: payload.email.trim().toLowerCase(),
        sessionId: payload.sessionId.trim(),
        exp: payload.exp,
    };
}

export function buildMemberActivationUrl(token: string) {
    return absoluteUrl(`/activate?token=${encodeURIComponent(token)}`);
}

export async function sendMemberActivationEmail(input: {
    email: string;
    firstName?: string | null;
    sessionId: string;
}) {
    const email = String(input.email || "").trim().toLowerCase();
    const sessionId = String(input.sessionId || "").trim();
    if (!email || !sessionId) {
        return { ok: false as const, skipped: true as const, reason: "Missing email or session id" };
    }

    const token = createMemberActivationToken({ email, sessionId });
    const activationUrl = buildMemberActivationUrl(token);
    const firstName = String(input.firstName || "").trim() || firstNameFromEmail(email);

    return sendEmail({
        to: email,
        subject: "Complete your Present Health account",
        text: [
            `Hi ${firstName},`,
            "",
            "Your Present Health membership payment is complete.",
            "",
            "Create your account password here:",
            activationUrl,
            "",
            "This link expires in 7 days.",
            "",
            "If you did not expect this email, reply and let us know.",
        ].join("\n"),
        html: [
            '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#111827;">',
            `<p>Hi ${escapeHtml(firstName)},</p>`,
            "<p>Your Present Health membership payment is complete.</p>",
            `<p><a href="${escapeHtml(activationUrl)}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Create your account password</a></p>`,
            `<p>If the button does not work, use this link:<br/><a href="${escapeHtml(activationUrl)}">${escapeHtml(activationUrl)}</a></p>`,
            "<p>This link expires in 7 days.</p>",
            "</div>",
        ].join(""),
    });
}
