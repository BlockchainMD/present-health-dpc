import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";

export default function AdminEmployersPage() {
    return (
        <div className="max-w-5xl space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Employers</h1>
                <p className="text-sm text-muted-foreground">
                    Manage the employer landing page, inquiries, and supporting content shown on{" "}
                    <span className="font-mono">/for-employers</span>.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg">Inquiries</CardTitle>
                        <CardDescription>Track inbound employer interest and update statuses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/admin/employers/inquiries">View inquiries</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg">Testimonials</CardTitle>
                        <CardDescription>Add and curate employer testimonials for the public page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/admin/employers/testimonials">Manage testimonials</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg">Outreach CRM</CardTitle>
                        <CardDescription>Track employer prospects, outreach stages, follow-ups, and deal pipeline.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/admin/employers/crm">Open CRM</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-border/60">
                    <CardHeader>
                        <CardTitle className="text-lg">Employer FAQs</CardTitle>
                        <CardDescription>Edit the FAQ section rendered on the employer landing page.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full" variant="outline">
                            <Link href="/admin/employers/faq">Edit FAQs</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
