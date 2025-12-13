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
                            Primary Care, Finally Unlocked.
                            <br />
                            Virtual DPC for the modern era.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-foreground">Practice</h3>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
                            <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                            <li><Link href="/#benefits" className="hover:text-primary transition-colors">Benefits</Link></li>
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
                            <li><a href="mailto:hello@presenthealth.com" className="hover:text-primary transition-colors">hello@presenthealth.com</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-border/50 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} Present Health. All rights reserved.
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md text-center md:text-right">
                        Present Health is a Direct Primary Care practice, not insurance. We do not bill insurance. <br />
                        Services are provided by a licensed physician where permitted. Availability varies by state. <br />
                        *Membership fees may be HSA/FSA eligible starting 2026, subject to IRS rules and limits. Consult a tax professional.
                    </p>
                </div>
            </div>
        </footer>
    );
}
