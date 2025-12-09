"use client";

import { Check, X } from "lucide-react";

export function Comparison() {
    return (
        <section className="py-24 bg-muted/30" id="benefits">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                        The 2026 Advantage: Elite Care is Finally Deductible.
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Historically, Direct Primary Care (DPC) was an "extra" cost. New regulations have changed the game.
                        You can now fund your membership entirely with pre-tax HSA/FSA dollars.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Old DPC Card */}
                    <div className="bg-background rounded-2xl p-8 border border-border/50 opacity-70 hover:opacity-100 transition-opacity">
                        <h3 className="text-xl font-semibold mb-2 text-muted-foreground">Traditional DPC</h3>
                        <div className="text-3xl font-bold mb-6 text-muted-foreground">$150 - $200<span className="text-lg font-normal">/mo</span></div>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-muted-foreground">
                                <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <span>Paid with post-tax dollars (expensive)</span>
                            </li>
                            <li className="flex items-start gap-3 text-muted-foreground">
                                <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <span>Often ineligible for HSA/FSA</span>
                            </li>
                            <li className="flex items-start gap-3 text-muted-foreground">
                                <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                <span>Manual reimbursement paperwork</span>
                            </li>
                        </ul>
                    </div>

                    {/* Present Health Card */}
                    <div className="bg-[#0F4C3A] text-white rounded-3xl p-8 border border-primary/20 shadow-2xl relative overflow-hidden transform md:-translate-y-4">
                        <div className="absolute top-0 right-0 bg-white text-[#0F4C3A] text-xs font-bold px-4 py-1.5 rounded-bl-2xl">
                            RECOMMENDED
                        </div>
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>

                        <h3 className="text-xl font-semibold mb-2 text-white/90">The Present Health Way</h3>
                        <div className="mb-8">
                            <div className="text-4xl font-bold text-white">$129<span className="text-lg font-normal text-white/60">/mo</span></div>
                            <div className="text-lg text-white/80 font-medium mt-1">(Net cost: ~$90*)</div>
                        </div>
                        <ul className="space-y-4 relative z-10">
                            <li className="flex items-start gap-3">
                                <div className="p-0.5 bg-white/20 rounded-full shrink-0 mt-0.5">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="font-medium text-white/90">100% Pre-tax (HSA/FSA Card accepted)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="p-0.5 bg-white/20 rounded-full shrink-0 mt-0.5">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-white/80">Auto-Substantiated (No paperwork)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="p-0.5 bg-white/20 rounded-full shrink-0 mt-0.5">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-white/80">IRS Compliant (&lt;$150/mo cap locked in)</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="p-0.5 bg-white/20 rounded-full shrink-0 mt-0.5">
                                    <Check className="h-3.5 w-3.5 text-white" />
                                </div>
                                <span className="text-white/80">Unbundled labs/meds for compliance</span>
                            </li>
                        </ul>
                        <p className="text-xs text-white/40 mt-8 italic border-t border-white/10 pt-4">*Assuming 30% income tax bracket savings</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
