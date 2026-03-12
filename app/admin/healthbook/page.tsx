import { HealthbookSeoWorkspace } from "@/components/admin/HealthbookSeoWorkspace";
import { getHealthbookFeedSnapshot } from "@/lib/healthbook";

export const runtime = "nodejs";

export default async function AdminHealthbookPage() {
  const { items, generatedAt } = await getHealthbookFeedSnapshot();

  return <HealthbookSeoWorkspace items={items} generatedAt={generatedAt} />;
}
