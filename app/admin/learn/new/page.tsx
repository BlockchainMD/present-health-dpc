import { prisma } from "@/lib/prisma";
import { LearnArticleEditor } from "@/components/admin/LearnArticleEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getPhysicians() {
    try {
        return await prisma.physician.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true, slug: true, credentials: true },
        });
    } catch (error) {
        console.error("[admin/learn/new] Failed to fetch physicians", error);
        return [];
    }
}

export default async function NewLearnArticlePage() {
    const physicians = await getPhysicians();

    return (
        <LearnArticleEditor
            physicians={physicians}
            initial={{
                status: "DRAFT",
                schemaType: "Article",
                refreshRequested: false,
            }}
        />
    );
}

