import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { MemberDashboardShell } from "@/components/dashboard/MemberDashboardShell";
import { authOptions } from "@/lib/auth";
import { getHealthbookFeedSnapshot } from "@/lib/healthbook";
import { prisma } from "@/lib/prisma";

const memberSinceFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user as { role?: string }).role === "ADMIN") {
    redirect("/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      subscriptionStatus: true,
      createdAt: true,
    },
  });

  if (!user?.email) {
    redirect("/login");
  }

  const { items: feedItems, generatedAt: feedGeneratedAt } = await getHealthbookFeedSnapshot();

  return (
    <MemberDashboardShell
      userName={user.name ?? null}
      userEmail={user.email}
      subscriptionStatus={user.subscriptionStatus || "inactive"}
      memberSinceLabel={memberSinceFormatter.format(user.createdAt)}
      feedItems={feedItems}
      feedGeneratedAt={feedGeneratedAt}
    />
  );
}
