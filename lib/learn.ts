import { markdownToPlainText } from "@/lib/markdown-plain";

export type LearnCategorySlug =
    | "dpc-basics"
    | "hsa-finances"
    | "telehealth-guide"
    | "health-wellness"
    | "state-guides"
    | "for-employers";

export const LEARN_CATEGORIES: { slug: LearnCategorySlug; label: string }[] = [
    { slug: "dpc-basics", label: "DPC Basics" },
    { slug: "hsa-finances", label: "HSA & Finances" },
    { slug: "telehealth-guide", label: "Telehealth Guide" },
    { slug: "health-wellness", label: "Health & Wellness" },
    { slug: "state-guides", label: "State Guides" },
    { slug: "for-employers", label: "For Employers" },
];

const CATEGORY_BY_SLUG = new Map(LEARN_CATEGORIES.map((c) => [c.slug, c.label] as const));

export function categoryLabel(slug: string | null | undefined) {
    if (!slug) return null;
    return CATEGORY_BY_SLUG.get(slug as LearnCategorySlug) || null;
}

export function isLearnCategorySlug(value: string | null | undefined): value is LearnCategorySlug {
    if (!value) return false;
    return CATEGORY_BY_SLUG.has(value as LearnCategorySlug);
}

export function estimateReadTimeMinutes(markdown: string) {
    const plain = markdownToPlainText(markdown || "");
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0;
    const wpm = 225;
    const minutes = words / wpm;
    return Math.max(1, Math.ceil(minutes));
}

