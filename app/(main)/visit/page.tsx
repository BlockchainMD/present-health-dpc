import { redirect } from "next/navigation";

type SearchParams =
    | { [key: string]: string | string[] | undefined }
    | Promise<{ [key: string]: string | string[] | undefined }>;

function toSearchString(value: Record<string, string | string[] | undefined>) {
    const params = new URLSearchParams();
    for (const [key, raw] of Object.entries(value)) {
        if (Array.isArray(raw)) {
            for (const item of raw) {
                if (typeof item === "string" && item.trim()) {
                    params.append(key, item);
                }
            }
            continue;
        }
        if (typeof raw === "string" && raw.trim()) {
            params.set(key, raw);
        }
    }
    const query = params.toString();
    return query ? `?${query}` : "";
}

export default async function VisitPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    redirect(`/book${toSearchString(params || {})}`);
}
