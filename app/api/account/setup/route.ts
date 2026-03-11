import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { recordConversionEvent } from "@/lib/conversion";
import { parseMemberSetupToken } from "@/lib/member-account-setup";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
        }

        const token = cleanString((body as Record<string, unknown>).token);
        const password = cleanString((body as Record<string, unknown>).password);
        if (!token || !password) {
            return NextResponse.json({ message: "Token and password are required." }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ message: "Password must be at least 8 characters." }, { status: 400 });
        }

        const payload = parseMemberSetupToken(token);
        if (!payload) {
            return NextResponse.json({ message: "This account setup link is invalid or expired." }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.update({
            where: { id: payload.userId, email: payload.email },
            data: { password: hashedPassword },
            select: { id: true, email: true, leadId: true, attributionSessionId: true },
        });

        await recordConversionEvent({
            type: "ACCOUNT_SETUP_COMPLETED",
            attributionSessionId: user.attributionSessionId,
            userId: user.id,
            leadId: user.leadId,
            metadata: {
                source: "AccountSetupAPI",
            },
        });

        return NextResponse.json({ success: true, email: user.email });
    } catch (error) {
        console.error("[AccountSetupAPI] Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
