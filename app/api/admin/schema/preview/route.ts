import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { generateSchemaForPath } from "@/lib/schema-audit";
import { schemaTypeList, validateSchemaBlockBasics } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = (searchParams.get("path") || "").trim();
    if (!path) {
        return NextResponse.json({ success: false, error: "Missing path query param" }, { status: 400 });
    }

    try {
        const blocks = await generateSchemaForPath(path);
        return NextResponse.json({
            success: true,
            path,
            blocks,
            schemaTypes: schemaTypeList(blocks),
            issues: validateSchemaBlockBasics(blocks),
        });
    } catch (error) {
        console.error("[AdminSchemaPreviewAPI] GET error:", error);
        return NextResponse.json({ success: false, error: "Failed to generate schema preview" }, { status: 500 });
    }
}

