import { slugify } from "@/lib/slug";

export type UsState = { name: string; code: string; slug: string };

export const US_STATES: UsState[] = [
    { name: "Alabama", code: "AL", slug: "alabama" },
    { name: "Alaska", code: "AK", slug: "alaska" },
    { name: "Arizona", code: "AZ", slug: "arizona" },
    { name: "Arkansas", code: "AR", slug: "arkansas" },
    { name: "California", code: "CA", slug: "california" },
    { name: "Colorado", code: "CO", slug: "colorado" },
    { name: "Connecticut", code: "CT", slug: "connecticut" },
    { name: "Delaware", code: "DE", slug: "delaware" },
    { name: "District of Columbia", code: "DC", slug: "district-of-columbia" },
    { name: "Florida", code: "FL", slug: "florida" },
    { name: "Georgia", code: "GA", slug: "georgia" },
    { name: "Hawaii", code: "HI", slug: "hawaii" },
    { name: "Idaho", code: "ID", slug: "idaho" },
    { name: "Illinois", code: "IL", slug: "illinois" },
    { name: "Indiana", code: "IN", slug: "indiana" },
    { name: "Iowa", code: "IA", slug: "iowa" },
    { name: "Kansas", code: "KS", slug: "kansas" },
    { name: "Kentucky", code: "KY", slug: "kentucky" },
    { name: "Louisiana", code: "LA", slug: "louisiana" },
    { name: "Maine", code: "ME", slug: "maine" },
    { name: "Maryland", code: "MD", slug: "maryland" },
    { name: "Massachusetts", code: "MA", slug: "massachusetts" },
    { name: "Michigan", code: "MI", slug: "michigan" },
    { name: "Minnesota", code: "MN", slug: "minnesota" },
    { name: "Mississippi", code: "MS", slug: "mississippi" },
    { name: "Missouri", code: "MO", slug: "missouri" },
    { name: "Montana", code: "MT", slug: "montana" },
    { name: "Nebraska", code: "NE", slug: "nebraska" },
    { name: "Nevada", code: "NV", slug: "nevada" },
    { name: "New Hampshire", code: "NH", slug: "new-hampshire" },
    { name: "New Jersey", code: "NJ", slug: "new-jersey" },
    { name: "New Mexico", code: "NM", slug: "new-mexico" },
    { name: "New York", code: "NY", slug: "new-york" },
    { name: "North Carolina", code: "NC", slug: "north-carolina" },
    { name: "North Dakota", code: "ND", slug: "north-dakota" },
    { name: "Ohio", code: "OH", slug: "ohio" },
    { name: "Oklahoma", code: "OK", slug: "oklahoma" },
    { name: "Oregon", code: "OR", slug: "oregon" },
    { name: "Pennsylvania", code: "PA", slug: "pennsylvania" },
    { name: "Rhode Island", code: "RI", slug: "rhode-island" },
    { name: "South Carolina", code: "SC", slug: "south-carolina" },
    { name: "South Dakota", code: "SD", slug: "south-dakota" },
    { name: "Tennessee", code: "TN", slug: "tennessee" },
    { name: "Texas", code: "TX", slug: "texas" },
    { name: "Utah", code: "UT", slug: "utah" },
    { name: "Vermont", code: "VT", slug: "vermont" },
    { name: "Virginia", code: "VA", slug: "virginia" },
    { name: "Washington", code: "WA", slug: "washington" },
    { name: "West Virginia", code: "WV", slug: "west-virginia" },
    { name: "Wisconsin", code: "WI", slug: "wisconsin" },
    { name: "Wyoming", code: "WY", slug: "wyoming" },
];

const byCode = new Map(US_STATES.map((s) => [s.code.toUpperCase(), s]));
const byName = new Map(US_STATES.map((s) => [s.name.toLowerCase(), s]));
const bySlug = new Map(US_STATES.map((s) => [s.slug, s]));

export function stateFromNameOrCode(value: string): UsState | null {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const codeCandidate = raw.replace(/[^a-z]/gi, "").toUpperCase();
    if (codeCandidate.length === 2 && byCode.has(codeCandidate)) return byCode.get(codeCandidate)!;

    const normalizedNameInput = raw.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
    const lower = normalizedNameInput.toLowerCase();
    if (byName.has(lower)) return byName.get(lower)!;

    const slug = slugify(normalizedNameInput);
    if (bySlug.has(slug)) return bySlug.get(slug)!;

    return null;
}

export function stateDisplayName(value: string): string {
    return stateFromNameOrCode(value)?.name ?? String(value || "").trim();
}

export function stateCode(value: string): string | null {
    return stateFromNameOrCode(value)?.code ?? null;
}

export function stateSlug(value: string): string {
    return stateFromNameOrCode(value)?.slug ?? slugify(String(value || ""));
}
