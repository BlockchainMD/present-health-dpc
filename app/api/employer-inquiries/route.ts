import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyEmployerInquiry } from "@/lib/notify";
import { upsertUnifiedLeadFromEmployerInquiry } from "@/lib/unified-leads";
import { queueAutoResponseFromEmployerInquiry } from "@/lib/auto-response";

export const runtime = "nodejs";

const EMPLOYEE_COUNT_RANGES = new Set(["5-10", "11-25", "26-50", "51-100", "100+"]);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const payload = body as Record<string, unknown>;

        const companyName = typeof payload.companyName === "string" ? payload.companyName.trim() : "";
        const contactName = typeof payload.contactName === "string" ? payload.contactName.trim() : "";
        const emailRaw = typeof payload.email === "string" ? payload.email.trim() : "";
        const email = emailRaw.toLowerCase();
        const phoneRaw = typeof payload.phone === "string" ? payload.phone.trim() : "";
        const phone = phoneRaw ? phoneRaw : undefined;

        const employeeCountRaw = payload.employeeCount;
        const employeeCount =
            typeof employeeCountRaw === "number"
                ? employeeCountRaw
                : typeof employeeCountRaw === "string" && employeeCountRaw.trim()
                    ? Number.parseInt(employeeCountRaw.trim(), 10)
                    : undefined;

        const employeeCountRangeRaw = typeof payload.employeeCountRange === "string" ? payload.employeeCountRange.trim() : "";
        const employeeCountRange = employeeCountRangeRaw && EMPLOYEE_COUNT_RANGES.has(employeeCountRangeRaw) ? employeeCountRangeRaw : undefined;
        const messageRaw = typeof payload.message === "string" ? payload.message.trim() : "";
        const message = messageRaw ? messageRaw : undefined;

        if (!companyName || !contactName || !email) {
            return NextResponse.json(
                { error: "Missing required fields: companyName, contactName, email" },
                { status: 400 }
            );
        }

        if (Number.isNaN(employeeCount)) {
            return NextResponse.json({ error: "employeeCount must be a number" }, { status: 400 });
        }

        const inquiry = await prisma.employerInquiry.create({
            data: {
                companyName,
                contactName,
                email,
                phone,
                employeeCount,
                employeeCountRange,
                message,
            },
        });

        void upsertUnifiedLeadFromEmployerInquiry(inquiry, true).catch((error) => {
            console.error("[EmployerInquiriesAPI] Failed to sync unified lead", error);
        });

        // Best-effort notification email. The inquiry is already saved even if this fails.
        void notifyEmployerInquiry(inquiry).catch((error) => {
            console.error("[EmployerInquiriesAPI] Failed to notify", error);
        });

        void queueAutoResponseFromEmployerInquiry(inquiry).catch((error) => {
            console.error("[EmployerInquiriesAPI] Failed to queue auto-response", error);
        });

        return NextResponse.json({ success: true, id: inquiry.id });
    } catch (error) {
        console.error("[EmployerInquiriesAPI] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
