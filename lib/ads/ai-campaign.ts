import { prisma } from '@/lib/prisma';
import { validateCampaignSpec, DENYLIST } from './compliance';
import OpenAI from "openai";
import { CampaignSpec } from './types';

export async function generateCampaignSpec(strategy: 'TRANSACTIONAL' | 'EDUCATIONAL' = 'TRANSACTIONAL', inlet?: any): Promise<CampaignSpec> {
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
    const isEducational = strategy === 'EDUCATIONAL';
    const persona = inlet?.persona || "People needing primary care";
    const intent = inlet?.problem || "Tired of waiting for doctor appointments";

    const prompt = `
Act as an expert search marketing strategist for Present Health, a **Virtual Direct Primary Care (DPC)** practice.
Your goal is to generate a campaign specification that will be used to create Google Ads and Landing Pages.

STRATEGY: ${strategy}
${isEducational ? 'GOAL: Educate first, convert second. Target problem-aware users looking for answers.' : 'GOAL: Direct conversion. Target solution-aware users looking for a doctor.'}

${inlet ? `CONTEXT: We are targeting the topic "${inlet.topic}" specifically for the persona "${persona}".` : ''}

EXISTING CAMPAIGNS (DO NOT DUPLICATE THESE):
${context}

CORE VIRTUAL DPC BENEFITS (MUST INCLUDE):
- Direct Access: Text/email your doctor anytime.
- Virtual Care: Unlimited visits via text/video/phone. No travel.
- Relationship: A doctor who actually knows your name.
- Transparent Pricing: $149/mo individual, $299/mo family. No insurance needed.

INSTRUCTIONS:
1. Persona: Identify a high-intent audience segment ${inlet ? `based on ${persona}` : ''}.
2. Intent: Define what they are searching for (The "Pain Point") ${inlet ? `focusing on ${intent}` : ''}.
3. Seed Keywords: Generate 3-5 high-value keywords. ${isEducational ? 'Focus on questions or symptoms.' : 'Focus on service/location keywords.'}
4. Benefits: 4 specific benefits tailored to this persona.
5. Proof Points: 3 items that build trust (experience, credentials, patient focus).
6. Disclaimers: Required legal/compliance disclaimers (e.g., "Not insurance").
7. Slug: Unique URL slug for the campaign (e.g., "nomad-health-burnout").

STRICT NO "prescription", "Rx", "medication", or "pharmacy" terms.
Strictly NO "24/7" (Use "Direct Access" or "Extended Hours").

RETURN VALID JSON ONLY:
{
  "slug": "unique-slug",
  "persona": "...",
  "intent": "...",
  "landingSlug": "...",
  "seedKeywords": ["...", "..."],
  "benefits": ["...", "..."],
  "proofPoints": ["...", "..."],
  "disclaimers": ["Not insurance", "..."],
  "geo": "US",
  "tone": "Empathetic & Professional",
  "strategy": "${strategy}",
  "layoutType": "${isEducational ? 'EDUCATIONAL' : 'CONVERSION'}"
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
    function sanitizeString(str: string): string {
        if (!str) return "";
        let clean = str;

        // 1. Proactively replace specific known patterns
        clean = clean.replace(/24\/7/gi, "Direct Access");
        clean = clean.replace(/24 hours/gi, "Direct Access");
        clean = clean.replace(/\d{2,3}% satisfaction/gi, "High satisfaction");

        // 2. Search for and remove any terms from the DENYLIST
        // We do this by creating a giant regex for efficiency
        const forbiddenRegex = new RegExp(`\\b(${DENYLIST.join('|')})\\b`, 'gi');

        // If a forbidden term is found, we try to remove the whole sentence or just the term
        // For now, let's just strip the term and any surrounding awkwardness
        clean = clean.replace(forbiddenRegex, "[Restricted Term Removed]");

        return clean.trim();
    }

    // Checking for forbidden patterns to filter out completely
    const forbiddenPatterns = [/24\/7/i, /24 hours/i, /around the clock/i];
    // Add regexes for a few high-risk denylist items that often appear in sentences
    const highRiskPhrases = ["prescription", "medication", "ozempic", "wegovy", "cure", "guarantee"];
    highRiskPhrases.forEach(p => forbiddenPatterns.push(new RegExp(p, "i")));

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

    return {
        slug: spec.slug,
        persona: spec.persona,
        intent: spec.intent,
        seedKeywords: spec.seedKeywords || [],
        strategy: spec.strategy || strategy,
        layoutType: spec.layoutType || (strategy === 'EDUCATIONAL' ? 'EDUCATIONAL' : 'CONVERSION'),
        benefits: spec.benefits,
        proofPoints: spec.proofPoints,
        disclaimers: spec.disclaimers,
        budgetDaily: spec.budgetDaily || 50,
        targetCpa: spec.targetCpa || 30,
        geo: spec.geo || 'US',
        tone: spec.tone || 'Empathetic & Professional'
    };
}
