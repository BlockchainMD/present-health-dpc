import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const body = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin",
        "",
        `Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    ].join("\n");

    return new NextResponse(body, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

