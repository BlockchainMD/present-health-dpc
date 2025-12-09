import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQAccordion() {
    return (
        <section className="py-12 bg-muted/30">
            <div className="container px-4 md:px-6 mx-auto max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight text-center mb-8">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>Is Present Health health insurance?</AccordionTrigger>
                        <AccordionContent>
                            No. We are a Direct Primary Care (DPC) practice. We do not bill insurance.
                            We recommend pairing our membership with a high-deductible health plan (HDHP) or health sharing ministry for catastrophic coverage.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>Can I really use my HSA/FSA?</AccordionTrigger>
                        <AccordionContent>
                            Yes! Thanks to the "One Big Beautiful Bill Act" (Jan 1, 2026), DPC memberships below specific price caps ($150/individual, $300/family) are now fully eligible expenses for HSAs and FSAs.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger>Are labs and medications included?</AccordionTrigger>
                        <AccordionContent>
                            To maintain IRS compliance for HSA eligibility, we must unbundle variable costs like labs and meds.
                            However, we have negotiated wholesale cash prices for our members, often 80-90% cheaper than insurance prices. You pay exactly what we pay.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger>What if I need to see a specialist?</AccordionTrigger>
                        <AccordionContent>
                            We handle 80-90% of medical issues directly. If you need a specialist, we will coordinate the referral, send your records, and follow up with you afterwards. We act as the quarterback for your health.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>
    );
}
