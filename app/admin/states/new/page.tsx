import { StateEditor } from "@/components/admin/StateEditor";

export const runtime = "nodejs";

export default function NewStatePage() {
    return <StateEditor initial={{ isActive: false }} />;
}

