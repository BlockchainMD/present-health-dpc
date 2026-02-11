function normalizeOrigin(raw: string) {
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    // Support VERCEL_URL-style values like "myapp.vercel.app"
    return `https://${trimmed}`;
}

export function getSiteOrigin() {
    const fromEnv =
        process.env.SITE_URL ||
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.VERCEL_URL ||
        "";
    const origin = normalizeOrigin(fromEnv);
    return origin || "https://presenthealthmd.com";
}

export function absoluteUrl(path: string) {
    return new URL(path, getSiteOrigin()).toString();
}

