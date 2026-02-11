import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET() {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const physicians = await prisma.physician.findMany({
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
        });
        return NextResponse.json({ success: true, physicians });
    } catch (error) {
        console.error("[AdminPhysiciansAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch physicians" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const payload = body as Record<string, unknown>;

        const name = typeof payload.name === "string" ? payload.name.trim() : "";
        const slug = typeof payload.slug === "string" ? payload.slug.trim() : "";
        if (!name || !slug) {
            return NextResponse.json({ success: false, error: "Missing required fields: name, slug" }, { status: 400 });
        }

        const physician = await prisma.physician.create({
            data: {
                name,
                slug,
                credentials: typeof payload.credentials === "string" ? payload.credentials.trim() : null,
                boardCertification: typeof payload.boardCertification === "string" ? payload.boardCertification.trim() : null,
                bio: typeof payload.bio === "string" ? payload.bio : null,
                photoUrl: typeof payload.photoUrl === "string" ? payload.photoUrl.trim() : null,
                statesLicensed: Array.isArray(payload.statesLicensed)
                    ? payload.statesLicensed.filter((x) => typeof x === "string").map((x) => (x as string).trim()).filter(Boolean)
                    : [],
                npiNumber: typeof payload.npiNumber === "string" ? payload.npiNumber.trim() : null,
                yearsExperience:
                    typeof payload.yearsExperience === "number"
                        ? payload.yearsExperience
                        : typeof payload.yearsExperience === "string" && payload.yearsExperience.trim()
                            ? Number.parseInt(payload.yearsExperience.trim(), 10)
                            : null,
                isActive: typeof payload.isActive === "boolean" ? payload.isActive : false,
            },
        });

        return NextResponse.json({ success: true, physician });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 409 });
        }
        console.error("[AdminPhysiciansAPI] POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to create physician" }, { status: 500 });
    }
}

