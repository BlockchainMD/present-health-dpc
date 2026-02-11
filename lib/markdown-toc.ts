import { slugify } from "@/lib/slug";

export type TocItem = {
    level: 2 | 3;
    text: string;
    id: string;
};

function createHeadingIdFactory() {
    const counts = new Map<string, number>();
    return (text: string) => {
        const base = slugify(text);
        if (!base) return "";
        const next = (counts.get(base) || 0) + 1;
        counts.set(base, next);
        return next === 1 ? base : `${base}-${next}`;
    };
}

export function extractToc(markdown: string): TocItem[] {
    const lines = String(markdown || "").split(/\r?\n/);
    const items: TocItem[] = [];
    const headingId = createHeadingIdFactory();

    let inCodeFence = false;
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith("```")) {
            inCodeFence = !inCodeFence;
            continue;
        }
        if (inCodeFence) continue;
        if (!line.startsWith("##")) continue;

        const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
        if (!match) continue;
        const hashes = match[1];
        const text = match[2].replace(/\s+#*$/, "").trim();
        const level = hashes.length as 2 | 3;
        const id = headingId(text);
        if (!id) continue;
        items.push({ level, text, id });
    }

    return items;
}

export function makeHeadingIdGetter() {
    const headingId = createHeadingIdFactory();
    return (text: string) => headingId(text);
}

