import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

export function HsaInfo() {
    return (
        <section id="hsa-info" className="py-20 bg-emerald-50/50 border-y border-emerald-100">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-emerald-950">
                        In 2026, Direct Primary Care becomes HSA-friendly.*
                    </h2>
                    <p className="text-lg text-emerald-800/80">
                        IRS guidance allows eligible people to use HSA funds for certain DPC memberships starting Jan 1, 2026, with a fee cap of <strong className="text-emerald-900">$150/mo individual / $300/mo family</strong> (indexed).
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
                    <Card className="border-emerald-200 bg-white/80 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl text-emerald-900">How it works</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">1</div>
                                <p className="text-sm text-emerald-900/80">You keep (or choose) an HSA-eligible plan if you want to contribute to an HSA.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">2</div>
                                <p className="text-sm text-emerald-900/80">You join Present Health at <strong>$149/mo</strong> (Individual) or <strong>$299/mo</strong> (Family) — both under the IRS monthly limits.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">3</div>
                                <p className="text-sm text-emerald-900/80">You pay with your HSA card (and keep documentation for your records).</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-emerald-100/50 p-6 rounded-xl border border-emerald-200">
                        <h3 className="font-semibold text-emerald-900 mb-3">Note on Labs</h3>
                        <p className="text-sm text-emerald-800/80 leading-relaxed">
                            <strong>Why labs + meds are billed separately:</strong> The IRS definition of qualifying DPC services excludes prescription drugs and certain lab services, so we keep the membership compliant by billing these separately at transparent, at-cost pricing.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
