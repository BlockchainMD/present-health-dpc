import { prisma } from '@/lib/prisma';
import { validateContent } from './compliance';

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

    // 2. Generate Content (Deterministic/Idempotent)
    // In Phase 1, we use a structured template. In Phase 2, this could use LLM.
    const content = {
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
