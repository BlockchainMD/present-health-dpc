import Image from "next/image";
import { Quote } from "lucide-react";

export function PhysicianPromise() {
    return (
        <section className="py-24 bg-background relative overflow-hidden">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                    {/* Image Side */}
                    <div className="relative order-2 md:order-1">
                        <div className="aspect-[3/4] rounded-2xl bg-muted relative overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
                            <Image
                                src="/doctor-portrait.jpg"
                                alt="Present Health Physician"
                                fill
                                className="object-cover"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
                            <div className="absolute bottom-6 left-6 z-20 text-white">
                                <div className="text-xl font-bold">Present Health</div>
                                <div className="text-sm opacity-90">Virtual Direct Primary Care</div>
                            </div>
                        </div>
                        {/* Decorative element */}
                        <div className="absolute -z-10 top-10 -left-10 w-full h-full border-2 border-primary/20 rounded-2xl"></div>
                    </div>

                    {/* Content Side */}
                    <div className="order-1 md:order-2">
                        <div className="inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8">
                            The Present Health Way
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 leading-tight">
                            Not a Corporate Clinic. <br />
                            <span className="text-primary italic">A Personal Commitment.</span>
                        </h2>

                        <div className="relative mb-10">
                            <Quote className="absolute -top-6 -left-6 h-12 w-12 text-primary/10" />
                            <p className="text-xl text-muted-foreground relative z-10 leading-relaxed font-light">
                                "We built Present Health because we believe you deserve a doctor who has time to think about your health, not just your billing code.
                                <span className="block mt-4 font-medium text-foreground">When you join, you don't get a call center. You get a dedicated physician."</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 border-t border-border pt-8">
                            <div>
                                <div className="text-4xl font-bold text-primary mb-1 tracking-tighter">10+</div>
                                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Years Experience</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-primary mb-1 tracking-tighter">100%</div>
                                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Board Certified</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-primary mb-1 tracking-tighter">Solo</div>
                                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Practice Model</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-primary mb-1 tracking-tighter">24/7</div>
                                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Direct Access</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
