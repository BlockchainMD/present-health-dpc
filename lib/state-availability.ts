import { prisma } from "@/lib/prisma";
import { stateFromNameOrCode, stateSlug } from "@/lib/us-states";

export type ServedState = {
    name: string;
    slug: string;
};

function normalizeInputState(value: unknown) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const parsed = stateFromNameOrCode(raw);
    if (parsed) {
        return { name: parsed.name, slug: parsed.slug };
    }
    const slug = stateSlug(raw);
    if (!slug) return null;
    return { name: raw, slug };
}

export async function listServedStates(): Promise<ServedState[]> {
    try {
        const rows = await prisma.state.findMany({
            where: { isActive: true },
            select: { name: true, slug: true },
            orderBy: { name: "asc" },
        });
        return rows;
    } catch (error) {
        console.error("[state-availability] Failed to list served states", error);
        return [];
    }
}

export async function resolveServedState(value: unknown): Promise<ServedState | null> {
    const normalized = normalizeInputState(value);
    if (!normalized) return null;

    try {
        const row = await prisma.state.findFirst({
            where: {
                isActive: true,
                OR: [{ slug: normalized.slug }, { name: normalized.name }],
            },
            select: { name: true, slug: true },
        });
        return row;
    } catch (error) {
        console.error("[state-availability] Failed to resolve served state", error);
        return null;
    }
}

