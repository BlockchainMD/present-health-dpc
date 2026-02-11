import { PhysicianEditor } from "@/components/admin/PhysicianEditor";

export const runtime = "nodejs";

export default function NewPhysicianPage() {
    return <PhysicianEditor initial={{ isActive: false }} />;
}

