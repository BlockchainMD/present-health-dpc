import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

function pickExtension(file: File) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".png")) return "png";
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "jpg";
    if (name.endsWith(".webp")) return "webp";
    if (file.type === "image/png") return "png";
    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/webp") return "webp";
    return null;
}

export async function POST(request: NextRequest, { params }: { params: Params }) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ success: false, error: 'Missing file field "file"' }, { status: 400 });
        }

        const ext = pickExtension(file);
        if (!ext) {
            return NextResponse.json({ success: false, error: "Unsupported file type. Use PNG, JPG, or WEBP." }, { status: 415 });
        }

        const maxBytes = 5 * 1024 * 1024;
        if (file.size > maxBytes) {
            return NextResponse.json({ success: false, error: "File too large (max 5MB)." }, { status: 413 });
        }

        const bytes = Buffer.from(await file.arrayBuffer());

        const uploadsDir = path.join(process.cwd(), "public", "uploads", "physicians");
        await mkdir(uploadsDir, { recursive: true });

        const filename = `physician-${id}-${Date.now()}.${ext}`;
        const absolutePath = path.join(uploadsDir, filename);
        await writeFile(absolutePath, bytes);

        const photoUrl = `/uploads/physicians/${filename}`;

        const physician = await prisma.physician.update({
            where: { id },
            data: { photoUrl },
        });

        return NextResponse.json({ success: true, physician });
    } catch (error) {
        console.error("[AdminPhysicianPhotoAPI] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to upload photo" }, { status: 500 });
    }
}

