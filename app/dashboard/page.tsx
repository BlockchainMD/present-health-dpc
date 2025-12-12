import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    const status = user?.subscriptionStatus || "inactive";
    const statusColor = status === "active" ? "text-green-600" : "text-yellow-600";

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-8">Patient Dashboard</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>Welcome, {user?.name}</CardTitle>
                        <CardDescription>{user?.email}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            Your account is {status}. {status === 'active' ? 'You can now access your health resources.' : 'Please complete your subscription.'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Membership Status</CardTitle>
                        <CardDescription>Current Plan</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={`text - 2xl font - bold ${statusColor} capitalize`}>{status}</div>
                        <p className="text-sm text-muted-foreground mt-2">
                            {status === 'active' ? 'Auto-renews monthly' : 'No active subscription'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <button className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors">
                            📅 Schedule Appointment
                        </button>
                        <button className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors">
                            💬 Message Doctor
                        </button>
                        <button className="w-full text-left px-4 py-2 rounded-md hover:bg-muted transition-colors">
                            📄 View Records
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
