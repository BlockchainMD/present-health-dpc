import { prisma } from '@/lib/prisma';
import { validateContent } from './compliance';
import OpenAI from "openai";

interface CampaignSpec {
    id: string;
    slug: string;
    persona: string;
    intent: string;
    benefits: string[];
    proofPoints: string[];
    disclaimers: string[];
    landingSlug: string;
}

export async function generateLandingPage(campaignId: string) {
    // 1. Fetch Campaign
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
    });

    if (!campaign) throw new Error('Campaign not found');

    // 2. Generate Content
    // 2. Generate Content
    // Default / Fallback Content
    let content: any = {
        hero: {
            headline: `Direct Primary Care for ${campaign.persona}`,
            subheadline: `Get the care you need for "${campaign.intent}" without the wait.`,
            cta: "Book a Free Intro Conversation"
        },
        benefits: campaign.benefits,
        howItWorks: [
            { title: "Book", desc: "Schedule a free intro call." },
            { title: "Meet", desc: "Talk to Dr. J directly." },
            { title: "Join", desc: "Sign up for membership." }
        ],
        proof: campaign.proofPoints,
        faqs: [
            { question: "Do you accept insurance?", answer: "We do not bill insurance directly. This allows us to keep costs transparent and focus on your care, not paperwork." },
            { question: "Can I text my doctor?", answer: "Yes! Members have direct access to their doctor via text and email." }
        ],
        ctaSection: {
            headline: "Ready to take control of your health?",
            subheadline: "Join Present Health today.",
            buttonText: "Book Your Free Intro Call"
        },
        disclaimer: [
            "Present Health is a Direct Primary Care practice, not insurance.",
            "We do not bill insurance.",
            ...campaign.disclaimers
        ].join(" ")
    };

    // Try to use AI for better copy if API key exists
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const prompt = `
            You are a professional copywriter for Present Health, a premium Direct Primary Care practice.
            Write the content for a high-converting landing page targeting this specific audience:
            
            Persona: ${campaign.persona}
            User Intent/Problem: ${campaign.intent}
            
            Project the value of "Direct Access", "Time Savings", and "Personal Relationship".
            
            STRICT RULES:
            - NO medical advice.
            - NO forbidden terms (cure, guarantee, specific % numbers).
            - Tone: Empathetic, Professional, Assuring.
            - Hero Headline: Short, punchy (Max 7 words).
            - Hero Subheadline: 1-2 sentences elaborating on the solution (Max 20 words).
            - How It Works: 3 STEPS tailored to this user. (e.g. for travelers: "1. Text us from anywhere...")
            - FAQs: 3 Questions & Answers that THIS SPECIFIC PERSONA would have. (e.g. "Can I access this while abroad?", "What about prescriptions?").
            - CTA Section: A final closing argument.
            
            RETURN JSON ONLY matching this structure:
            {
                "hero": { "headline": "...", "subheadline": "...", "cta": "..." },
                "howItWorks": [ { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." } ],
                "faqs": [ { "question": "...", "answer": "..." }, { "question": "...", "answer": "..." }, { "question": "...", "answer": "..." } ],
                "ctaSection": { "headline": "...", "subheadline": "...", "buttonText": "..." }
            }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.7
            });

            const text = response.choices[0]?.message?.content;
            if (text) {
                const json = JSON.parse(text);
                // Merge AI content with campaign data overrides
                content = {
                    ...content,
                    hero: json.hero || content.hero,
                    howItWorks: json.howItWorks || content.howItWorks,
                    faqs: json.faqs || content.faqs,
                    ctaSection: json.ctaSection || content.ctaSection
                };
            }
        } catch (e) {
            console.error("Failed to generate AI copy, falling back to template:", e);
        }
    }

    // 3. Validate Content
    const compliance = validateContent(JSON.stringify(content), "Landing Page");
    if (compliance.status === 'FAIL') {
        throw new Error(`Generated content failed compliance: ${compliance.reasons.join(', ')}`);
    }

    // 4. Save/Update CampaignRun
    // Check for existing run to be idempotent
    const existingRun = await prisma.campaignRun.findFirst({
        where: { campaignId: campaign.id },
        orderBy: { createdAt: 'desc' }
    });

    if (existingRun) {
        return await prisma.campaignRun.update({
            where: { id: existingRun.id },
            data: {
                landingPageContent: JSON.stringify(content),
                updatedAt: new Date()
            }
        });
    } else {
        return await prisma.campaignRun.create({
            data: {
                campaignId: campaign.id,
                landingPageContent: JSON.stringify(content),
                status: 'PENDING'
            }
        });
    }
}
