import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    try {
        const physician = await prisma.physician.findUnique({ where: { id } });
        if (!physician) {
            return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, physician });
    } catch (error) {
        console.error("[AdminPhysicianAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch physician" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== "object") {
            return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
        }
        const payload = body as Record<string, unknown>;

        const updateData: any = {};

        if (payload.name !== undefined) updateData.name = typeof payload.name === "string" ? payload.name.trim() : payload.name;
        if (payload.slug !== undefined) updateData.slug = typeof payload.slug === "string" ? payload.slug.trim() : payload.slug;
        if (payload.credentials !== undefined) updateData.credentials = typeof payload.credentials === "string" ? payload.credentials.trim() : payload.credentials;
        if (payload.boardCertification !== undefined)
            updateData.boardCertification = typeof payload.boardCertification === "string" ? payload.boardCertification.trim() : payload.boardCertification;
        if (payload.bio !== undefined) updateData.bio = typeof payload.bio === "string" ? payload.bio : payload.bio;
        if (payload.photoUrl !== undefined) updateData.photoUrl = typeof payload.photoUrl === "string" ? payload.photoUrl.trim() : payload.photoUrl;
        if (payload.npiNumber !== undefined) updateData.npiNumber = typeof payload.npiNumber === "string" ? payload.npiNumber.trim() : payload.npiNumber;
        if (payload.yearsExperience !== undefined) {
            updateData.yearsExperience =
                typeof payload.yearsExperience === "number"
                    ? payload.yearsExperience
                    : typeof payload.yearsExperience === "string" && payload.yearsExperience.trim()
                        ? Number.parseInt(payload.yearsExperience.trim(), 10)
                        : payload.yearsExperience === null
                            ? null
                            : null;
        }
        if (payload.isActive !== undefined) updateData.isActive = typeof payload.isActive === "boolean" ? payload.isActive : payload.isActive;
        if (payload.statesLicensed !== undefined) {
            updateData.statesLicensed = Array.isArray(payload.statesLicensed)
                ? payload.statesLicensed.filter((x) => typeof x === "string").map((x) => (x as string).trim()).filter(Boolean)
                : [];
        }

        const physician = await prisma.physician.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({ success: true, physician });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ success: false, error: "Slug already exists" }, { status: 409 });
        }
        console.error("[AdminPhysicianAPI] PATCH error:", error);
        return NextResponse.json({ success: false, error: "Failed to update physician" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    try {
        await prisma.physician.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AdminPhysicianAPI] DELETE error:", error);
        return NextResponse.json({ success: false, error: "Failed to delete physician" }, { status: 500 });
    }
}

