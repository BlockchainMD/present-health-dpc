import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PhysicianPage() {
    try {
        const physician = await prisma.physician.findFirst({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: { slug: true },
        });

        if (physician?.slug) {
            redirect(`/our-physicians/${physician.slug}`);
        }
    } catch {
        // Fallback below keeps route working if DB query fails.
    }

    redirect("/our-physicians");
}
