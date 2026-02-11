import { EmployerTestimonialEditor } from "@/components/admin/EmployerTestimonialEditor";

export const runtime = "nodejs";

export default function NewEmployerTestimonialPage() {
    return <EmployerTestimonialEditor initial={{ isActive: false, sortOrder: "0" }} />;
}

