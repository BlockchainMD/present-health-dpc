import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQAccordion() {
    const faqs = [
        {
            question: "Do I still need insurance?",
            answer: "Yes—keep insurance for emergencies, hospital care, and specialists. DPC isn’t insurance; it's a membership for your primary care needs."
        },
        {
            question: "Can I use my HSA for this?",
            answer: "Starting Jan 1, 2026, IRS guidance allows HSA funds to pay certain DPC fees within limits ($150/mo individual, $300/mo family), if you’re otherwise eligible. We recommend consulting a tax professional."
        },
        {
            question: "Why is enrollment limited?",
            answer: "Because access is the product. We cap membership to protect response times and ensure you can always reach your doctor when you need them."
        }
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
