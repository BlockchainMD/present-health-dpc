import Link from "next/link";
import Image from "next/image";

export function Footer() {
    return (
        <footer className="bg-muted/30 border-t border-border py-12 mt-auto">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-3 mb-4">
                            <div className="relative h-10 w-10">
                                <Image
                                    src="/logo-transparent.png"
                                    alt="Present Health Logo"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <span className="text-lg font-bold text-primary tracking-tight">
                                Present Health
                            </span>
                        </Link>
                        <p className="mt-4 text-sm text-muted-foreground">
                            Physician-led heart-health membership. $99/month, no insurance needed.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Explore</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
                            <li><Link href="/conditions" className="hover:text-primary transition-colors">Conditions</Link></li>
                            <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                            <li><Link href="/our-physicians" className="hover:text-primary transition-colors">Our Physicians</Link></li>
                            <li><Link href="/states" className="hover:text-primary transition-colors">States</Link></li>
                            <li><Link href="/book" className="hover:text-primary transition-colors">Get started</Link></li>
                            <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Legal</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Contact</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><a href="mailto:hello@presenthealthmd.com" className="hover:text-primary transition-colors">hello@presenthealthmd.com</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-border/50 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} Present Health. All rights reserved.
                    </p>
                    <div className="text-xs text-muted-foreground max-w-2xl text-center md:text-right space-y-1">
                        <p>Present Health is a flat-fee membership ($99/month individual, $179/month household) and does not bill insurance. Not a substitute for emergency care — call 911 for emergencies.</p>
                        <p>
                            Services provided by licensed clinicians. All clinical decisions are made or supervised by a board-certified physician.
                        </p>
                        <p>
                            Response times apply during business hours (M-F 8am-8pm ET). Availability varies by state. Lab and imaging costs billed separately at transparent prices.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
