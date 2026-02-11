import { prisma } from "@/lib/prisma";

export async function getActivePhysicians() {
    try {
        return await prisma.physician.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
        });
    } catch (error) {
        console.error("[public-site] Failed to fetch physicians", error);
        return [];
    }
}

export async function getPhysicianBySlug(slug: string) {
    try {
        return await prisma.physician.findUnique({ where: { slug } });
    } catch (error) {
        console.error("[public-site] Failed to fetch physician", { slug, error });
        return null;
    }
}

export async function getActiveStates() {
    try {
        return await prisma.state.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
        });
    } catch (error) {
        console.error("[public-site] Failed to fetch states", error);
        return [];
    }
}

export async function getAllStates() {
    try {
        return await prisma.state.findMany({
            orderBy: { name: "asc" },
        });
    } catch (error) {
        console.error("[public-site] Failed to fetch all states", error);
        return [];
    }
}

export async function getStateBySlug(slug: string) {
    try {
        return await prisma.state.findUnique({ where: { slug } });
    } catch (error) {
        console.error("[public-site] Failed to fetch state", { slug, error });
        return null;
    }
}
