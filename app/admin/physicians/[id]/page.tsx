import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PhysicianEditor } from "@/components/admin/PhysicianEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string } | Promise<{ id: string }>;

async function getPhysician(id: string) {
    try {
        return await prisma.physician.findUnique({ where: { id } });
    } catch (error) {
        console.error("[admin/physicians/[id]] Failed to fetch physician", { id, error });
        return null;
    }
}

export default async function EditPhysicianPage({ params }: { params: Params }) {
    const { id } = await params;
    const physician = await getPhysician(id);
    if (!physician) notFound();

    return (
        <PhysicianEditor
            initial={{
                id: physician.id,
                name: physician.name,
                slug: physician.slug,
                credentials: physician.credentials || "",
                boardCertification: physician.boardCertification || "",
                bio: physician.bio || "",
                photoUrl: physician.photoUrl || "",
                statesLicensed: physician.statesLicensed || [],
                npiNumber: physician.npiNumber || "",
                yearsExperience: typeof physician.yearsExperience === "number" ? String(physician.yearsExperience) : "",
                isActive: physician.isActive,
            }}
        />
    );
}

