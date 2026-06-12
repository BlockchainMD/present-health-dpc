import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StateEditor } from "@/components/admin/StateEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function getState(id: string) {
    try {
        return await prisma.state.findUnique({ where: { id } });
    } catch (error) {
        console.error("[admin/states/[id]] Failed to fetch state", { id, error });
        return null;
    }
}

export default async function EditStatePage({ params }: { params: Params }) {
    const { id } = await params;
    const state = await getState(id);
    if (!state) notFound();

    return (
        <StateEditor
            initial={{
                id: state.id,
                name: state.name,
                slug: state.slug,
                isActive: state.isActive,
                metaTitle: state.metaTitle || "",
                metaDescription: state.metaDescription || "",
                telehealthRegulationsSummary: state.telehealthRegulationsSummary || "",
                rxLogistics: state.rxLogistics || "",
                labOptions: state.labOptions || "",
                emergencyProtocol: state.emergencyProtocol || "",
                hsaNotes: state.hsaNotes || "",
                faqs: Array.isArray(state.faqs) ? (state.faqs as any) : [],
            }}
        />
    );
}
