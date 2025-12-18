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
    let hero = {
        headline: `Direct Primary Care for ${campaign.persona}`,
        subheadline: `Get the care you need for "${campaign.intent}" without the wait.`,
        cta: "Book a Free Intro Conversation"
    };

    // Try to use AI for better copy if API key exists
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const prompt = `
            You are a professional copywriter for Present Health, a premium Direct Primary Care practice.
            Write a compelling Headline and Subheadline for a landing page targeting this specific audience:
            
            Persona: ${campaign.persona}
            User Intent/Problem: ${campaign.intent}
            
            Project the value of "Direct Access", "Time Savings", and "Personal Relationship".
            
            STRICT RULES:
            - NO medical advice.
            - NO forbidden terms (cure, guarantee, specific % numbers).
            - Tone: Empathetic, Professional, Assuring.
            - Headline: Short, punchy (Max 7 words).
            - Subheadline: 1-2 sentneces elaborating on the solution (Max 20 words).
            - RETURN JSON ONLY: { "headline": "...", "subheadline": "..." }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [{ role: "system", content: "Return valid JSON." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.7
            });

            const text = response.choices[0]?.message?.content;
            if (text) {
                const json = JSON.parse(text);
                if (json.headline && json.subheadline) {
                    hero.headline = json.headline;
                    hero.subheadline = json.subheadline;
                }
            }
        } catch (e) {
            console.error("Failed to generate AI copy, falling back to template:", e);
        }
    }

    const content = {
        hero,
        benefits: campaign.benefits,
        howItWorks: [
            { title: "Book", desc: "Schedule a free intro call." },
            { title: "Meet", desc: "Talk to Dr. J directly." },
            { title: "Join", desc: "Sign up for membership." }
        ],
        proof: campaign.proofPoints,
        disclaimer: [
            "Present Health is a Direct Primary Care practice, not insurance.",
            "We do not bill insurance.",
            ...campaign.disclaimers
        ].join(" ")
    };

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
