import { prisma } from '@/lib/prisma';
import OpenAI from "openai";
import { CampaignSpec, LandingPageSpec } from './types';

export async function generateLandingPageSpec(campaignId: string, mockCampaign?: CampaignSpec): Promise<LandingPageSpec> {
    // 1. Fetch Campaign
    const campaign = mockCampaign || (await prisma.campaign.findUnique({
        where: { id: campaignId }
    }) as unknown as CampaignSpec);

    if (!campaign) throw new Error('Campaign not found');

    // 2. Generate Content
    let spec: LandingPageSpec = {
        hero: {
            headline: `Direct Primary Care for ${campaign.persona}`,
            subheadline: `Get the care you need for "${campaign.intent}" without the wait.`,
            cta: "Book a Free Intro Conversation"
        },
        educationalBriefing: undefined,
        benefits: campaign.benefits || [],
        howItWorks: [
            { title: "Book", desc: "Schedule a free intro call." },
            { title: "Meet", desc: "Talk to Dr. J directly." },
            { title: "Join", desc: "Sign up for membership." }
        ],
        proof: campaign.proofPoints || [],
        pricing: {
            headline: "Simple Monthly Membership",
            subheadline: "Direct access. Transparent pricing. No insurance required.",
            tiers: [
                {
                    name: "Individual",
                    price: 149,
                    period: "mo",
                    features: ["Unlimited virtual visits", "Direct messaging with Dr. J", "Care coordination", "Prevention planning"]
                },
                {
                    name: "Family",
                    price: 299,
                    period: "mo",
                    features: ["Unlimited visits for up to 5", "Pediatric triage", "Family prevention", "Direct access for all"]
                }
            ]
        },
        faqs: [
            { question: "Do you accept insurance?", answer: "We do not bill insurance directly. This allows us to keep costs transparent and focus on your care, not paperwork." },
            { question: "Can I text my doctor?", answer: "Yes! Members have direct access to your doctor via text and email." }
        ],
        ctaSection: {
            headline: "Ready to take control of your health?",
            subheadline: "Join Present Health today.",
            buttonText: "Book Your Free Intro Call"
        }
    };

    // Try to use AI for better copy if API key exists
    if (process.env.OPENAI_API_KEY) {
        try {
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const prompt = `
            You are a professional, high-conversion direct response copywriter for Present Health, a premium Direct Primary Care (DPC) practice.
            Your goal is to write landing page content that resonates deeply with a specific audience.
            
            Persona: ${campaign.persona}
            User Intent/Problem: ${campaign.intent}
            
            CORE VALUE PROPOSITIONS:
            - Direct Access: Text/email your doctor anytime.
            - Time Savings: No waiting rooms, same-day starts.
            - Relationship: A doctor who actually knows you.
            - Transparent Pricing: No insurance headaches.

            COPYWRITING INSTRUCTIONS:
            - HERO: Use "Pain-Benefit Mapping". Contrast the persona's frustration with our solution. (e.g. "Tired of [Problem]? Experience [Benefit]").
            - HOW IT WORKS: Tailor these 3 steps specifically to the ${campaign.persona}. Use active verbs.
            - FAQs: Address the top 3 psychological barriers or logistical questions THIS SPECIFIC persona would have. 
            - CTA: Make the final offer feel low-risk and high-reward.
            
            STRICT RULES:
            - NO medical advice or diagnosis.
            - NO forbidden terms: cure, guarantee, 100%, 24/7 (use "direct access" instead).
            - Hero Headline: Max 8 words.
            - Hero Subheadline: Max 25 words.
            - Tone: Empathetic, Authoritative, Premium.
            
            RETURN JSON ONLY:
            {
                "hero": { "headline": "...", "subheadline": "...", "cta": "..." },
                "howItWorks": [ { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." } ],
                "pricing": { "headline": "...", "subheadline": "..." },
                "faqs": [ { "question": "...", "answer": "..." }, { "question": "...", "answer": "..." }, { "question": "...", "answer": "..." } ],
                "ctaSection": { "headline": "...", "subheadline": "...", "buttonText": "..." }
            }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [
                    { role: "system", content: "You are a professional, high-conversion direct response copywriter for Present Health, a premium Direct Primary Care (DPC) practice. You write empathetic, authoritative, and premium copy." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7
            });

            const text = response.choices[0]?.message?.content;
            if (text) {
                const json = JSON.parse(text);
                spec = {
                    ...spec,
                    hero: json.hero || spec.hero,
                    howItWorks: (json.howItWorks && json.howItWorks.length > 0) ? json.howItWorks : spec.howItWorks,
                    pricing: {
                        ...spec.pricing,
                        headline: json.pricing?.headline || spec.pricing.headline,
                        subheadline: json.pricing?.subheadline || spec.pricing.subheadline,
                        tiers: spec.pricing.tiers // Explicitly keep our tiers, AI only tunes the headlines
                    },
                    faqs: (json.faqs && json.faqs.length > 0) ? json.faqs : spec.faqs,
                    ctaSection: json.ctaSection || spec.ctaSection
                };
            }

            // 2.5 Generate Educational Briefing if needed
            if (campaign.layoutType === 'EDUCATIONAL') {
                const briefingPrompt = `
                Write a high-authority, 400-word "Medical Briefing" for the persona "${campaign.persona}" about "${campaign.intent}".
                
                Goal: Educate them on why this is happening and how a high-access personal physician (DPC) is the best way to manage it.
                Tone: Editorial, Premium, Peer-to-peer.
                Format: Markdown. Use H2, H3, and bullet points.
                
                Strictly NO "prescription", "Rx", "medication".
                `;

                const briefingResponse = await openai.chat.completions.create({
                    model: "gpt-4-turbo",
                    messages: [{ role: "system", content: "You are a senior medical editor." }, { role: "user", content: briefingPrompt }],
                    temperature: 0.7
                });

                const briefingText = briefingResponse.choices[0]?.message?.content;
                if (briefingText) {
                    spec.educationalBriefing = briefingText;
                }
            }
        } catch (e) {
            console.error("Failed to generate AI copy, falling back to template:", e);
        }
    } else {
        // Fallback for educational briefing if no AI key
        if (campaign.layoutType === 'EDUCATIONAL') {
            spec.educationalBriefing = `
# Understanding Your Health: A Medical Briefing

At Present Health, we believe that the foundation of great care is a deep, unhurried relationship with your physician.

## Why This Matters
When addressing concerns like **${campaign.intent}**, you shouldn't be rushed through a 15-minute appointment. You deserve the time to explore the root causes.

## How DPC Helps
Direct Primary Care (DPC) gives us the freedom to focus entirely on you, not insurance paperwork. This means longer visits and direct access to Dr. J via text or video.
            `.trim();
        }
    }

    return spec;
}
