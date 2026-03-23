import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
    title: "Conditions We Treat | Present Health",
    description:
        "Comprehensive primary care for chronic disease management. We treat blood pressure, diabetes, thyroid, cholesterol, weight management, and more.",
};

const CONDITIONS = [
    {
        slug: "blood-pressure",
        name: "Blood Pressure Management",
        description: "Regular monitoring and medication management for hypertension.",
    },
    {
        slug: "diabetes",
        name: "Diabetes & A1C Management",
        description: "Comprehensive diabetes and prediabetes care with lab tracking.",
    },
    {
        slug: "weight-management",
        name: "Weight Management",
        description: "Evidence-based weight management including GLP-1 support.",
    },
    {
        slug: "thyroid",
        name: "Thyroid Management",
        description: "Thyroid condition monitoring and medication optimization.",
    },
    {
        slug: "cholesterol",
        name: "Cholesterol & Heart Health",
        description: "Cardiovascular risk assessment and cholesterol management.",
    },
    {
        slug: "general-primary-care",
        name: "General Primary Care",
        description: "Full-spectrum primary care for acute and chronic conditions.",
    },
];

export default function ConditionsPage() {
    return (
        <div className="min-h-screen bg-background py-24">
            <div className="container mx-auto px-4 md:px-6 max-w-5xl">
                <header className="max-w-3xl mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Conditions We Treat</h1>
                    <p className="text-lg text-muted-foreground">
                        Comprehensive primary care for chronic disease management and acute care through convenient video visits.
                    </p>
                </header>

                <div className="grid gap-6 sm:grid-cols-2 mb-12">
                    {CONDITIONS.map((condition) => (
                        <Link key={condition.slug} href={`/conditions/${condition.slug}`}>
                            <Card className="flex flex-col h-full border-border/70 hover:shadow-md transition-shadow cursor-pointer">
                                <CardHeader>
                                    <CardTitle className="text-lg">{condition.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-sm text-muted-foreground mb-4">{condition.description}</p>
                                    <div className="flex items-center gap-2 text-primary text-sm font-medium">
                                        Learn more
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <div className="text-center pt-8 border-t border-border">
                    <p className="text-muted-foreground mb-6">
                        Don't see your condition? We provide comprehensive primary care for a wide range of acute and chronic conditions.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/book">Book a Visit to Discuss Your Condition</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
