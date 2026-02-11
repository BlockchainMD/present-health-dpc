import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

interface PageProps {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function BookPage({ searchParams }: PageProps) {
    const pick = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
    const { runId, gclid, utm_source, utm_medium, utm_campaign, utm_term, utm_content } = searchParams;
    const runIdValue = pick(runId);
    const gclidValue = pick(gclid);
    const utmSourceValue = pick(utm_source);
    const utmMediumValue = pick(utm_medium);
    const utmCampaignValue = pick(utm_campaign);
    const utmTermValue = pick(utm_term);
    const utmContentValue = pick(utm_content);

    const calBaseUrl = "https://cal.com/jonathan-rouwhorst-1idf8k/15min";
    const calUrl = new URL(calBaseUrl);
    calUrl.searchParams.set("utm_source", utmSourceValue || "presenthealth");
    calUrl.searchParams.set("utm_medium", utmMediumValue || "website");
    calUrl.searchParams.set("utm_campaign", utmCampaignValue || runIdValue || "book-intro-call");
    if (utmTermValue) calUrl.searchParams.set("utm_term", utmTermValue);
    if (utmContentValue) calUrl.searchParams.set("utm_content", utmContentValue);
    if (!utmContentValue && runIdValue) calUrl.searchParams.set("utm_content", runIdValue);
    if (gclidValue) calUrl.searchParams.set("gclid", gclidValue);

    return (
        <div className="min-h-screen bg-background">
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {/* Back Link (Replaces redundant header) */}
                <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                <div className="grid lg:grid-cols-3 gap-12">
                    {/* Left Column: Context & Trust */}
                    <div className="lg:col-span-1 space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-4">Let's Chat.</h1>
                            <p className="text-lg text-muted-foreground">
                                Book a free 15-minute intro call with Dr. J. No sales pressure—just a conversation to see if we're a good fit.
                            </p>
                        </div>

                        <div className="bg-muted/30 p-6 rounded-xl border border-border">
                            <h3 className="font-semibold mb-4">What we'll cover:</h3>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    Your current health goals and frustrations.
                                </li>
                                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    How our direct primary care model works.
                                </li>
                                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                    Pricing, insurance questions, and next steps.
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm font-medium text-muted-foreground">Prefer to email?</p>
                            <a href="mailto:hello@presenthealthmd.com" className="flex items-center gap-2 text-primary hover:underline">
                                <Mail className="h-4 w-4" />
                                hello@presenthealthmd.com
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Cal.com Embed */}
                    <div className="lg:col-span-2 bg-background rounded-xl border border-border shadow-sm overflow-hidden min-h-[600px]">
                        <iframe
                            src={calUrl.toString()}
                            style={{ width: "100%", height: "100%", minHeight: "600px", border: "none" }}
                            title="Book an Intro Call"
                        ></iframe>
                    </div>
                </div>
            </main >
        </div >
    );
}
