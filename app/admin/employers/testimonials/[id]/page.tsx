import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmployerTestimonialEditor } from "@/components/admin/EmployerTestimonialEditor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string } | Promise<{ id: string }>;

async function getTestimonial(id: string) {
    try {
        return await prisma.employerTestimonial.findUnique({ where: { id } });
    } catch (error) {
        console.error("[admin/employers/testimonials/[id]] Failed to fetch testimonial", { id, error });
        return null;
    }
}

export default async function EditEmployerTestimonialPage({ params }: { params: Params }) {
    const { id } = await params;
    const testimonial = await getTestimonial(id);
    if (!testimonial) notFound();

    return (
        <EmployerTestimonialEditor
            initial={{
                id: testimonial.id,
                companyName: testimonial.companyName,
                quote: testimonial.quote,
                personName: testimonial.personName || "",
                personTitle: testimonial.personTitle || "",
                logoUrl: testimonial.logoUrl || "",
                sortOrder: String(testimonial.sortOrder ?? 0),
                isActive: testimonial.isActive,
            }}
        />
    );
}

