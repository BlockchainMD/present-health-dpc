import { MessageSquare, Smartphone, Calendar, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WhatYouGet() {
    const benefits = [
        {
            icon: <MessageSquare className="h-8 w-8 text-primary" />,
            title: "Your Doctor, In Your Pocket",
            description: "Text or email for quick questions, refills, and plan tweaks—without portals."
        },
        {
            icon: <Smartphone className="h-8 w-8 text-primary" />,
            title: "Virtual-First (Not Virtual-Only)",
            description: "We handle most issues by text/video/phone. When you need labs, imaging, or a specialist, we coordinate locally and help you find fair cash-pay pricing."
        },
        {
            icon: <Calendar className="h-8 w-8 text-primary" />,
            title: "Appointments when you need them",
            description: "Same- or next-day availability is the standard because membership is capped."
        },
        {
            icon: <Heart className="h-8 w-8 text-primary" />,
            title: "Whole-person primary care",
            description: "Prevention, metabolic health, mental health support, and chronic condition management—without 15-minute chaos."
        }
    ];

    return (
        <section id="benefits" className="py-20 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {benefits.map((benefit, index) => (
                        <Card key={index} className="border-none shadow-sm bg-background">
                            <CardHeader>
                                <div className="mb-4">{benefit.icon}</div>
                                <CardTitle className="text-xl">{benefit.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed">
                                    {benefit.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}
