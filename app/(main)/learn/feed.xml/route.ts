import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-url";
import { markdownToPlainText } from "@/lib/markdown-plain";

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

export async function GET() {
    const now = new Date();
    const articles = await prisma.article.findMany({
        where: {
            status: "PUBLISHED",
            slug: { not: null },
            OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
        },
        orderBy: [
            { publishedAt: { sort: "desc", nulls: "last" } as any },
            { createdAt: "desc" },
        ],
        take: 50,
        select: {
            slug: true,
            title: true,
            excerpt: true,
            metaDescription: true,
            content: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    const site = getSiteOrigin();
    const buildDate = new Date().toUTCString();

    const itemsXml = articles
        .map((a) => {
            const link = absoluteUrl(`/learn/${a.slug}`);
            const pub = (a.publishedAt || a.createdAt).toUTCString();
            const descSource = a.metaDescription || a.excerpt || markdownToPlainText(a.content).slice(0, 240);
            const desc = escapeXml(descSource);
            return [
                "<item>",
                `<title>${escapeXml(a.title)}</title>`,
                `<link>${escapeXml(link)}</link>`,
                `<guid isPermaLink="true">${escapeXml(link)}</guid>`,
                `<pubDate>${pub}</pubDate>`,
                `<description>${desc}</description>`,
                "</item>",
            ].join("");
        })
        .join("");

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        "<channel>",
        "<title>Present Health Learn</title>",
        `<link>${escapeXml(site + "/learn")}</link>`,
        "<description>Educational articles on DPC, telehealth, and preventive health.</description>",
        `<atom:link href="${escapeXml(site + "/learn/feed.xml")}" rel="self" type="application/rss+xml" />`,
        `<lastBuildDate>${buildDate}</lastBuildDate>`,
        itemsXml,
        "</channel>",
        "</rss>",
    ].join("\n");

    return new NextResponse(xml, {
        headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}

