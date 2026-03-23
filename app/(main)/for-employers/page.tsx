import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
    title: "For Employers | Present Health",
    description: "Employer and group programs coming soon.",
};

export default function ForEmployersPage() {
    return (
        <div className="min-h-screen bg-background py-24">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <Card className="border-border/70">
                    <CardHeader className="text-center">
                        <Badge className="mb-4 mx-auto">Coming Soon</Badge>
                        <CardTitle className="text-3xl md:text-4xl">Employer Programs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 text-center">
                        <p className="text-lg text-muted-foreground">
                            We're developing employer and group programs to bring virtual primary care to your workforce.
                        </p>
                        <p className="text-muted-foreground">
                            Check back soon for updates on how we can support your team's health and wellness.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            In the meantime, feel free to reach out to hello@presenthealthmd.com if you'd like to discuss opportunities for your organization.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
