import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service | Present Health",
    description: "Terms and conditions for using Present Health messaging-first primary care services.",
};

export default function TermsOfService() {
    return (
        <section className="py-20 bg-background">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
                <p className="text-muted-foreground mb-4">Last updated: March 20, 2026</p>
                <div className="space-y-4 text-muted-foreground">
                    <p>
                        Please read these Terms of Service carefully before using the Present Health website and services.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using our service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the service.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. Description of Service</h2>
                    <p>
                        Present Health provides virtual primary care services delivered through video visits with board-certified physicians. We accept most major commercial insurance plans. For patients without insurance, we offer self-pay visits at a transparent, flat rate of $29 per visit. Additional costs (such as lab work and imaging) are billed separately at transparent rates.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Services</h2>
                    <p>
                        Our services include video visits with physicians, prescription management, lab ordering, and care coordination for primary care conditions. Services are available on a per-visit basis. Patients with insurance pay their normal copay at the time of visit; we bill your insurance for the service. Patients without insurance pay the self-pay rate of $29 per visit.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Website Content &amp; No Physician-Patient Relationship</h2>
                    <p>
                        The educational articles, blog posts, and other content on the Present Health website are provided for general informational purposes only. This content does not constitute medical advice, diagnosis, or treatment and does not establish a physician-patient relationship between you and any Present Health clinician. Always consult a qualified healthcare provider regarding any medical condition or health concern. Do not disregard professional medical advice or delay seeking it because of something you have read on this website.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Medical Emergencies</h2>
                    <p>
                        Present Health is NOT for medical emergencies. If you have a medical emergency, call 911 or go to the nearest emergency room immediately.
                    </p>
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us at support@presenthealthmd.com.
                    </p>
                </div>
            </div>
        </section>
    );
}
