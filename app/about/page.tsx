import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
    title: "About | Present Health",
    description: "Learn about the mission behind Present Health.",
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container px-4 md:px-6 mx-auto py-24 max-w-4xl">
                <div className="grid md:grid-cols-2 gap-12 items-start">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted shadow-xl rotate-1 hover:rotate-0 transition-transform duration-500">
                        {/* Placeholder for Doctor Image */}
                        <Image
                            src="/doctor-portrait.jpg"
                            alt="Your Physician"
                            fill
                            className="object-cover"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
                        <div className="absolute bottom-6 left-6 z-20 text-white">
                            <div className="text-xl font-bold">Your Physician</div>
                            <div className="text-sm opacity-90">Present Health</div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h1 className="text-4xl font-bold tracking-tight text-foreground">
                            The Doctor Will See You Now. <span className="text-primary">(Actually)</span>
                        </h1>

                        <div className="prose prose-lg text-muted-foreground">
                            <p>
                                Present Health was founded with a simple mission:
                                to restore the sacred relationship between patient and physician.
                            </p>
                            <p>
                                For too long, the insurance industry has stood between us. They dictate what care you get,
                                how long we can spend with you (usually 7 minutes), and how much it costs.
                            </p>
                            <p>
                                We built Present Health to remove the noise.
                            </p>
                            <p>
                                <strong>Why "Present"?</strong> Because that's what you deserve. A doctor who is present
                                in the moment, listening to your story, not typing into a billing code generator.
                            </p>
                            <p>
                                We believe in direct connection, whether it's through code or through care. No middle-men. Just us.
                            </p>
                        </div>

                        <div className="pt-6 border-t border-border">
                            <h3 className="text-lg font-semibold mb-2">Our Standards</h3>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                <li>Board Certified Physicians</li>
                                <li>Extended Appointment Times</li>
                                <li>Direct Access to Your Doctor</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
