import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LearnArticleEditor } from "@/components/admin/LearnArticleEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function getArticle(id: string) {
    try {
        return await prisma.article.findUnique({ where: { id } });
    } catch (error) {
        console.error("[admin/learn/[id]] Failed to fetch article", { id, error });
        return null;
    }
}

async function getPhysicians() {
    try {
        return await prisma.physician.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true, slug: true, credentials: true },
        });
    } catch (error) {
        console.error("[admin/learn/[id]] Failed to fetch physicians", error);
        return [];
    }
}

export default async function EditLearnArticlePage({ params }: { params: Params }) {
    const { id } = await params;
    const [article, physicians] = await Promise.all([getArticle(id), getPhysicians()]);
    if (!article) notFound();

    return (
        <LearnArticleEditor
            physicians={physicians}
            initial={{
                id: article.id,
                title: article.title,
                slug: article.slug || "",
                status: (article.status as any) || "DRAFT",
                publishedAt: article.publishedAt ? article.publishedAt.toISOString() : "",
                updatedAt: article.updatedAt.toISOString(),
                metaTitle: article.metaTitle || "",
                metaDescription: article.metaDescription || "",
                excerpt: article.excerpt || "",
                category: (article.category as any) || "",
                schemaType: ((article.schemaType as any) || "Article") as any,
                featuredImage: (article.featuredImage as any) || "",
                authorPhysicianId: article.authorPhysicianId || "",
                refreshRequested: Boolean(article.refreshRequested),
                lastRefreshedAt: article.lastRefreshedAt ? article.lastRefreshedAt.toISOString() : "",
                content: article.content || "",
                faqs: Array.isArray(article.faqs) ? (article.faqs as any) : [],
            }}
        />
    );
}
