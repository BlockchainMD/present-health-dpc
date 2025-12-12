import { CheckCircle2, Clock, ShieldCheck, UserCheck } from "lucide-react";

export function SocialProof() {
    const items = [
        {
            icon: <UserCheck className="h-6 w-6 text-primary" />,
            text: "10+ years experience",
        },
        {
            icon: <ShieldCheck className="h-6 w-6 text-primary" />,
            text: "Board-certified family medicine",
        },
        {
            icon: <CheckCircle2 className="h-6 w-6 text-primary" />,
            text: "No insurance billing / no middlemen",
        },
        {
            icon: <Clock className="h-6 w-6 text-primary" />,
            text: "Direct physician access (responses typically within 1 business day)",
        },
    ];

    return (
        <section className="bg-muted/30 border-y border-border py-8">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 justify-center sm:justify-start">
                            <div className="flex-shrink-0">{item.icon}</div>
                            <span className="text-sm font-medium text-foreground">{item.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
