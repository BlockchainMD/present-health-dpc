import { prisma } from "@/lib/prisma";

export type EmployerFaqItem = { question: string; answer: string };

const KEY_EMPLOYER_FAQS = "employers:faq";

const DEFAULT_FAQS: EmployerFaqItem[] = [
    {
        question: "What does DPC cover for employees?",
        answer: "Direct Primary Care (DPC) covers primary care: visits, prevention planning, chronic condition management, and day-to-day medical questions. It does not replace insurance for hospitalizations, surgery, or most specialists.",
    },
    {
        question: "Do we still need insurance if we offer DPC?",
        answer: "Many employers pair DPC with a lower-cost catastrophic plan for emergencies, hospital care, and specialists. Your broker can help design the best combination for your team.",
    },
    {
        question: "How does billing work?",
        answer: "You pay a simple monthly per-employee fee. We can support centralized billing and straightforward onboarding for distributed teams.",
    },
    {
        question: "Is Present Health available in my state?",
        answer: "Availability depends on where employees are located and clinician licensing coverage. See our states page for current availability.",
    },
];

function coerceFaqs(value: unknown): EmployerFaqItem[] | null {
    if (!value) return null;
    if (Array.isArray(value)) return value as any;
    if (typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;
    const faqs = obj.faqs;
    if (Array.isArray(faqs)) return faqs as any;
    return null;
}

function normalizeFaqs(items: EmployerFaqItem[]) {
    return (items || [])
        .map((x) => ({
            question: typeof x?.question === "string" ? x.question.trim() : "",
            answer: typeof x?.answer === "string" ? x.answer.trim() : "",
        }))
        .filter((x) => x.question && x.answer);
}

export async function getEmployerFaqs(): Promise<EmployerFaqItem[]> {
    try {
        const row = await prisma.contentStrategy.findUnique({ where: { key: KEY_EMPLOYER_FAQS } });
        const parsed = coerceFaqs(row?.value);
        if (!parsed) return DEFAULT_FAQS;
        const normalized = normalizeFaqs(parsed as any);
        return normalized.length ? normalized : DEFAULT_FAQS;
    } catch (error) {
        console.error("[employers] Failed to load FAQs", error);
        return DEFAULT_FAQS;
    }
}

export async function upsertEmployerFaqs(nextFaqs: EmployerFaqItem[]) {
    const faqs = normalizeFaqs(nextFaqs);
    await prisma.contentStrategy.upsert({
        where: { key: KEY_EMPLOYER_FAQS },
        update: { value: { faqs, updatedAt: new Date().toISOString() } as any },
        create: { key: KEY_EMPLOYER_FAQS, value: { faqs, updatedAt: new Date().toISOString() } as any },
    });
    return faqs;
}

