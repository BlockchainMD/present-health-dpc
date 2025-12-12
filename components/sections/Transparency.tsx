import { Check, X } from "lucide-react";

export function Transparency() {
    return (
        <section className="py-20 bg-background border-t border-border">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
                    <div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
                            <Check className="h-6 w-6" /> Included
                        </h3>
                        <ul className="space-y-3">
                            {["Sick visits", "Rashes", "UTIs", "Refills", "Chronic care (BP, lipids, diabetes)", "Prevention planning", "Referrals"].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-muted-foreground">
                            <X className="h-6 w-6" /> Not Included
                        </h3>
                        <ul className="space-y-3">
                            {[
                                "Emergency care (call 911)",
                                "Hospital bills",
                                "Most labs/imaging and prescriptions (billed separately)"
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-3 text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
