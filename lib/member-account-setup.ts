import crypto from "crypto";

import { sendEmail } from "@/lib/email";
import { absoluteUrl } from "@/lib/site-url";

type MemberSetupTokenPayload = {
    v: 1;
    kind: "member-setup";
    userId: string;
    email: string;
    exp: number;
};

const MEMBER_SETUP_TOKEN_VERSION = 1;
const MEMBER_SETUP_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7;

function getSecret() {
    return String(process.env.ACCOUNT_SETUP_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "").trim();
}

function encodeBase64Url(value: string) {
    return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
    return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function displayFirstName(value: string | null | undefined, email: string) {
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed;
    const local = email.split("@")[0] || "there";
    return local.replace(/[^a-zA-Z]/g, "") || "there";
}

export function createMemberSetupToken(input: {
    userId: string;
    email: string;
    expiresInMs?: number;
}) {
    const secret = getSecret();
    if (!secret) return null;

    const payload: MemberSetupTokenPayload = {
        v: MEMBER_SETUP_TOKEN_VERSION,
        kind: "member-setup",
        userId: input.userId,
        email: input.email.trim().toLowerCase(),
        exp: Date.now() + (input.expiresInMs || MEMBER_SETUP_EXPIRY_MS),
    };
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = sign(encodedPayload, secret);
    return `${encodedPayload}.${signature}`;
}

export function parseMemberSetupToken(token: string) {
    const raw = String(token || "").trim();
    if (!raw) return null;

    const secret = getSecret();
    if (!secret) return null;

    const [encodedPayload, encodedSignature] = raw.split(".");
    if (!encodedPayload || !encodedSignature) return null;

    const expectedSignature = sign(encodedPayload, secret);
    if (encodedSignature !== expectedSignature) return null;

    try {
        const parsed = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<MemberSetupTokenPayload>;
        if (parsed.v !== MEMBER_SETUP_TOKEN_VERSION) return null;
        if (parsed.kind !== "member-setup") return null;
        if (typeof parsed.userId !== "string" || !parsed.userId.trim()) return null;
        if (typeof parsed.email !== "string" || !parsed.email.trim()) return null;
        if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp) || parsed.exp < Date.now()) return null;
        return parsed as MemberSetupTokenPayload;
    } catch {
        return null;
    }
}

export function memberSetupUrl(token: string) {
    return absoluteUrl(`/setup-account?token=${encodeURIComponent(token)}`);
}

export async function sendMemberSetupEmail(input: {
    userId: string;
    email: string;
    firstName?: string | null;
}) {
    const token = createMemberSetupToken({ userId: input.userId, email: input.email });
    if (!token) {
        return {
            ok: false as const,
            skipped: true as const,
            reason: "Missing ACCOUNT_SETUP_TOKEN_SECRET or NEXTAUTH_SECRET",
        };
    }

    const url = memberSetupUrl(token);
    const firstName = displayFirstName(input.firstName, input.email);

    return sendEmail({
        to: input.email,
        subject: "Finish setting up your Present Health account",
        text: [
            `Hi ${firstName},`,
            "",
            "Your Present Health membership is active.",
            "Set your password to open your dashboard and finish account setup:",
            url,
            "",
            "This link expires in 7 days.",
        ].join("\n"),
        html: [
            `<p>Hi ${firstName},</p>`,
            "<p>Your Present Health membership is active.</p>",
            `<p><a href="${url}">Set your password and open your dashboard</a></p>`,
            "<p>This link expires in 7 days.</p>",
        ].join(""),
    });
}
