import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQAccordion() {
    const faqs = [
        {
            question: "Is Present Health insurance?",
            answer: "No. Present Health is a Direct Primary Care membership for primary care services. It does not replace insurance for hospitalization, surgery, specialist care, or emergencies."
        },
        {
            question: "Why one plan?",
            answer: "Healthcare should not have fine print. One price covers all primary care services within our scope. No premium tier for prescriptions and no add-on for video."
        },
        {
            question: "Are video visits included?",
            answer: "Yes. When clinically appropriate, video visits are included in membership."
        },
        {
            question: "What about lab costs?",
            answer: "We order labs at transparent pricing. Labs and imaging are billed separately by the lab or imaging provider."
        },
        {
            question: "Can I cancel?",
            answer: "Monthly plans can be canceled anytime. Annual plans can be canceled for a prorated refund."
        },
        {
            question: "What if I start with a single visit and want to join?",
            answer: "Your intake is already done. Just upgrade to membership and start messaging anytime."
        },
    ];

    return (
        <section className="py-20 bg-muted/30">
            <div className="container mx-auto px-4 md:px-6 max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight mb-12 text-center">Frequently Asked Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-left font-medium text-lg">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground leading-relaxed">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}
