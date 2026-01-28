import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';
import { getFullPromptContext } from '@/lib/ads/brand-context';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = params;

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          where: { status: { in: ['READY_FOR_REVIEW', 'DEPLOYED', 'PAUSED'] } }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const brandContext = getFullPromptContext();

    // Format previous attempts
    let previousAttempts = "";
    if (campaign.runs && campaign.runs.length > 0) {
      previousAttempts = "\n# PREVIOUS AD ATTEMPTS (ALREADY TESTED - DO NOT DUPLICATE)\n";
      campaign.runs.forEach((run, idx) => {
        previousAttempts += `Attempt ${idx + 1}:\n`;
        if (run.rsaHeadlines && run.rsaHeadlines.length > 0) {
          previousAttempts += `- Headlines: ${run.rsaHeadlines.join(" | ")}\n`;
        }
        if (run.rsaDescriptions && run.rsaDescriptions.length > 0) {
          previousAttempts += `- Descriptions: ${run.rsaDescriptions.join(" | ")}\n`;
        }
        previousAttempts += "\n";
      });
    }

    const prompt = `
# MISSION
Act as a Senior Direct Response Copywriter and Healthcare Marketing Strategist for Present Health. 
Your goal is to generate the highest-performance Google Ads and Landing Page assets possible. 
You MUST provide original, creative variations for the ad headlines and descriptions that improve upon previous attempts. 
STRICTLY avoid phrases or hooks used in the provided history. focus on the specific persona's psychological triggers.

# BRAND CONTEXT
${brandContext}
${previousAttempts}
# CAMPAIGN TARGET
- Persona: ${campaign.persona}
- Intent: ${campaign.intent}
- Seed Keywords: ${campaign.seedKeywords.join(', ')}
- Strategy: ${campaign.strategy}
- Tone: ${campaign.tone}

# YOUR TASK
1. Analyze the persona and intent deeply.
2. Generate highly effective Google Ads assets (RSA) following all compliance rules.
3. Generate a modular landing page specification that aligns with the chosen strategy.
4. If strategy is EDUCATIONAL, write a high-authority 400-word Medical Briefing.

# OUTPUT FORMAT (MANDATORY)
Return valid JSON only in the following schema. No extra text, no markdown code blocks.

{
  "adPlan": {
    "rsa": {
      "headlines": ["Headline 1 (max 30 symbols)", "Headline 2", ...],
      "descriptions": ["Description 1 (max 90 symbols)", "Description 2", ...]
    },
    "keywords": [
      {"text": "keyword", "matchType": "PHRASE"},
      ...
    ]
  },
  "landingPageSpec": {
     "hero": { "headline": "...", "subheadline": "...", "cta": "..." },
     "educationalBriefing": "...", 
     "howItWorks": [ { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." }, { "title": "...", "desc": "..." } ],
     "pricing": { "headline": "...", "subheadline": "..." },
     "faqs": [ { "question": "...", "answer": "..." }, { "question": "...", "answer": "..." }, { "question": "...", "answer": "..." } ],
     "ctaSection": { "headline": "...", "subheadline": "...", "buttonText": "..." }
  }
}
`.trim();

    return NextResponse.json({ prompt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
