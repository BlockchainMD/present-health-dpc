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
    // 1. Fetch Existing Context to Avoid Duplication (Limit to last 50 to save tokens)
    const existingCampaigns = await prisma.campaign.findMany({
        select: { slug: true, persona: true, intent: true },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    const context = existingCampaigns.map(c =>
        `- Slug: ${c.slug}, Persona: ${c.persona}, Intent: ${c.intent}`
    ).join("\n");

    // 2. Prompt Engineering
    const prompt = `
Act as a Google Ads Strategist for Present Health, a Virtual Direct Primary Care (DPC) practice.
We want to launch a NEW search ad campaign that targets a high-potential "micro-niche" audience.
Instead of broad "primary care", target specific life situations where DPC is a perfect fit.

EXISTING CAMPAIGNS (DO NOT DUPLICATE THESE):
${context}

TASK:
Create a JSON specification for a NEW campaign targeting a distinct, specific micro-niche.
Examples of micro-niches: "Truck drivers on the road", "Freelance digital nomads", "Busy real estate agents", "Parents of kids with chronic ear infections", "Executive assistants managing boss's health".
Be CREATIVE and QUIRKY. The goal is to find cheap clicks in under-served segments.

CRITICAL UNIQUENESS RULE:
- Check the "EXISTING CAMPAIGNS" list above.
- Do NOT generate a campaign that is "substantially equivalent" to any of them.
- Substantially equivalent means: targeting the same persona/intent combination, even if words are slightly different.
- You must find a NEW angle, new persona, or new problem to solve.

REQUIREMENTS:
- Strictly NO "prescription", "Rx", "medication", or "pharmacy" terms.
- STRICTLY FORBIDDEN CLAIMS (Do NOT use these): 
  - "24/7" (Are we actually 24/7? Assume no for safety).
  - Specific percentages (e.g., "95% satisfaction").
  - Specific user counts (e.g., "10,000 users").
- NUANCE ON ACCESS:
  - Emphasize "direct personal connection" and "unrushed time".
  - Frame it as "text/email your doctor directly" or "your doctor in your pocket".
  - DO NOT imply "instant midnight response" or "around-the-clock" availability. We are human.
- HIGHLIGHT DPC BENEFITS:
  - "30-60 minute appointments" (vs 15 min industry avg).
  - "No waiting rooms" (Starts on time).
  - "Same-day or next-day scheduling".
  - "Wholesale prices on labs".
  - "Direct relationship" (No middlemen/insurance hassles).
- Focus on "access", "convenience", "relationship", "time", "peace of mind".
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
  "differentiationReason": "Internal note: brief explanation of how this differs from existing campaigns",
  "disclaimers": ["Disclaimer 1"],
  "budgetDaily": 50,
  "targetCpa": 30,
  "geo": "US",
  "tone": "Professional & Empathetic"
}
`;

    // 3. Call OpenAI with Retry Logic
    let attempts = 0;
    const maxAttempts = 2;
    let spec: any = {};

    while (attempts < maxAttempts) {
        attempts++;
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: "You are a Google Ads expert. Return valid JSON only. STRICTLY FOLLOW NEGATIVE CONSTRAINTS." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8,
        });

        const text = response.choices[0]?.message?.content || "{}";
        spec = JSON.parse(text);

        // 4. Validate and Retry if needed
        const compliance = validateCampaignSpec(spec);
        if (compliance.status === 'PASS') {
            break;
        } else {
            console.warn(`Attempt ${attempts} failed compliance:`, compliance.reasons);
            if (attempts === maxAttempts) {
                console.error("Max attempts reached. Returning compliant-best-effort spec.");
            }
        }
    }

    // 5. Post-Processing / Sanitization (Safety Net)
    // Even if validation passed (or failed max retries), strictly remove forbidden terms to be safe.
    // 5. Post-Processing / Sanitization (Safety Net)
    // Even if validation passed (or failed max retries), strictly remove forbidden terms to be safe.
    function sanitizeString(str: string): string {
        if (!str) return "";
        let clean = str;
        // Replace 24/7 with 'Direct Access'
        clean = clean.replace(/24\/7/gi, "Direct Access");
        clean = clean.replace(/24 hours/gi, "Direct Access");
        // Remove specific percentages
        clean = clean.replace(/\d{2,3}% satisfaction/gi, "High satisfaction");
        return clean;
    }

    // Checking for 24/7 keywords to filter out completely
    const forbiddenPatterns = [/24\/7/i, /24 hours/i, /around the clock/i];
    function isSafe(str: string): boolean {
        return !forbiddenPatterns.some(p => p.test(str));
    }

    if (spec.benefits) {
        spec.benefits = spec.benefits.filter(isSafe).map(sanitizeString);
        if (spec.benefits.length === 0) spec.benefits = ["Direct Messaging with Doctor", "Same-Day Appointments", "No Waiting Rooms"];
    }

    if (spec.proofPoints) {
        spec.proofPoints = spec.proofPoints.filter(isSafe).map(sanitizeString);
        if (spec.proofPoints.length === 0) spec.proofPoints = ["5-Star Patient Reviews", "Board-Certified Physicians"];
    }

    if (spec.seedKeywords) spec.seedKeywords = spec.seedKeywords.map(sanitizeString);
    if (spec.intent) spec.intent = sanitizeString(spec.intent);

    return spec;
}
