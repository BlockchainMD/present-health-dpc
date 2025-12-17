import OpenAI from "openai";
import { prisma } from '@/lib/prisma';
import { validateCampaignSpec } from './compliance';

export async function generateCampaignSpec() {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY");
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // 1. Fetch Existing Context to Avoid Duplication
    const existingCampaigns = await prisma.campaign.findMany({
        select: { slug: true, persona: true, intent: true }
    });

    const context = existingCampaigns.map(c =>
        `- Slug: ${c.slug}, Persona: ${c.persona}, Intent: ${c.intent}`
    ).join("\n");

    // 2. Prompt Engineering
    const prompt = `
Act as a Google Ads Strategist for Present Health, a Virtual Direct Primary Care (DPC) practice.
We want to launch a NEW search ad campaign that targets a high-potential audience we haven't targeted yet.

EXISTING CAMPAIGNS (DO NOT DUPLICATE THESE):
${context}

TASK:
Create a JSON specification for a NEW campaign targeting a distinct persona or intent.
Focus on high-value niches (e.g., freelancers, travelers, chronic conditions, rural access, second opinions).

REQUIREMENTS:
- Strictly NO "prescription", "Rx", "medication", or "pharmacy" terms.
- Focus on "access", "convenience", "relationship", "time".
- Budget: Default to 50.
- Target CPA: Default to 30.

OUTPUT JSON FORMAT:
{
  "slug": "kebab-case-slug",
  "persona": "Target Persona Name",
  "intent": "Specific user intent/problem",
  "landingSlug": "kebab-case-landing-slug",
  "seedKeywords": ["keyword 1", "keyword 2", "keyword 3"],
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "proofPoints": ["Proof 1", "Proof 2"],
  "disclaimers": ["Disclaimer 1"],
  "budgetDaily": 50,
  "targetCpa": 30,
  "geo": "US",
  "tone": "Professional & Empathetic"
}
`;

    // 3. Call OpenAI
    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
            { role: "system", content: "You are a Google Ads expert. Return valid JSON only." },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8, // Higher temperature for creativity/novelty
    });

    const text = response.choices[0]?.message?.content || "{}";
    const spec = JSON.parse(text);

    // 4. Validate Generated Spec
    const compliance = validateCampaignSpec(spec);
    if (compliance.status === 'FAIL') {
        // In a real system, we might retry. For now, we append a warning or error.
        console.warn("AI generated non-compliant spec:", compliance.reasons);
        // Attempt to clean or just return with error flag? 
        // Let's return it but the UI will catch the validation error on review.
    }

    return spec;
}
