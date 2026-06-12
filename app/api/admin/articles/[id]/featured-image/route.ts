import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

export const runtime = "nodejs";

type Params = Promise<{ id: string }>;

function isSupportedImage(file: File) {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    if (type === "image/png" || type === "image/jpeg" || type === "image/webp") return true;
    if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp")) return true;
    return false;
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
        if (!isSupportedImage(file)) {
            return NextResponse.json({ success: false, error: "Unsupported file type. Use PNG, JPG, or WEBP." }, { status: 415 });
        }
        const maxBytes = 8 * 1024 * 1024;
        if (file.size > maxBytes) {
            return NextResponse.json({ success: false, error: "File too large (max 8MB)." }, { status: 413 });
        }

        const input = Buffer.from(await file.arrayBuffer());
        const optimized = await sharp(input)
            .rotate()
            .resize({ width: 1600, withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();

        const uploadsDir = path.join(process.cwd(), "public", "uploads", "articles");
        await mkdir(uploadsDir, { recursive: true });

        const filename = `article-${id}-${Date.now()}.webp`;
        const absolutePath = path.join(uploadsDir, filename);
        await writeFile(absolutePath, optimized);

        const featuredImage = `/uploads/articles/${filename}`;

        const article = await prisma.article.update({
            where: { id },
            data: { featuredImage },
        });

        return NextResponse.json({ success: true, article });
    } catch (error) {
        console.error("[AdminArticleFeaturedImageAPI] Error:", error);
        return NextResponse.json({ success: false, error: "Failed to upload featured image" }, { status: 500 });
    }
}

