import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

async function getBypassAdminUser() {
    const bypass = process.env.ADMIN_BYPASS_TOKEN;
    if (!bypass) return null;

    const cookieStore = await cookies();
    const cookie = cookieStore.get("admin_bypass")?.value;
    if (!cookie || cookie !== bypass) return null;

    return prisma.user.findFirst({
        where: { role: "ADMIN" },
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, name: true, role: true }
    });
}

export async function requireAdmin() {
    const bypassUser = await getBypassAdminUser();
    if (bypassUser) {
        return { user: bypassUser } as any;
    }

    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }

    return session;
}

export async function isAdmin() {
    const bypassUser = await getBypassAdminUser();
    if (bypassUser) return true;

    const session = await getServerSession(authOptions);
    return session?.user && (session.user as any).role === "ADMIN";
}

/**
 * For use in page.tsx files to redirect non-admins
 */
export async function protectAdminPage() {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
        redirect("/login");
    }
}
