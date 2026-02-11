import { NextResponse } from "next/server";
import { buildSitemapEntries } from "@/lib/sitemap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeXml(value: string) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: Date, changefreq: string, priority: number) {
    const lines = [`<loc>${escapeXml(loc)}</loc>`];
    lines.push(`<lastmod>${lastmod.toISOString()}</lastmod>`);
    lines.push(`<changefreq>${escapeXml(changefreq)}</changefreq>`);
    lines.push(`<priority>${priority.toFixed(1)}</priority>`);
    return `<url>${lines.join("")}</url>`;
}

export async function GET() {
    const entries = await buildSitemapEntries();
    const urlsXml = entries
        .map((entry) => urlEntry(entry.loc, entry.lastmod, entry.changefreq, entry.priority))
        .join("\n");

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        urlsXml,
        "</urlset>",
    ].join("\n");

    return new NextResponse(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}
