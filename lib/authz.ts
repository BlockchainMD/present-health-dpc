import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export async function requireAdmin() {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }

    return session;
}

export async function isAdmin() {
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
