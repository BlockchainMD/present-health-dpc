import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

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
                <Card className="md:col-span-2 border-primary/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                            {user?.name?.[0]}
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Welcome to Present Health, {user?.name?.split(' ')[0]}</CardTitle>
                            <CardDescription>We&apos;re glad you&apos;re here. Let&apos;s get you started.</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted/30 rounded-lg p-4 border border-border">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">1</span>
                                Your Welcome Call
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                A member of our care team will call you at the number you provided within **1-2 business hours** to complete your intake and introduce you to your doctor.
                            </p>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 border border-border">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">2</span>
                                Messaging your Care Team
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2">
                                Once your intake is complete, you&apos;ll be able to message your care team directly from this dashboard. For urgent matters before your call, email <a href="mailto:care@presenthealthmd.com" className="text-primary hover:underline">care@presenthealthmd.com</a>.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle>Membership</CardTitle>
                        <CardDescription>Status & Billing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${statusColor} capitalize mb-1`}>{status}</div>
                        <p className="text-xs text-muted-foreground">
                            {status === 'active' ? 'Full access to all member benefits.' : 'Please visit your email to complete checkout.'}
                        </p>
                        {status === 'active' && (
                            <div className="mt-6 pt-6 border-t border-border">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Links</h4>
                                <ul className="space-y-2 text-sm">
                                    <li><a href="#" className="text-primary hover:underline">Membership Agreement</a></li>
                                    <li><a href="#" className="text-primary hover:underline">Privacy Policy (HIPAA)</a></li>
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
