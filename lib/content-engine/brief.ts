import OpenAI from 'openai';
import { Brief, TopicSignal } from './types';
import { classifyCluster, estimateRisk, pickAngle, pickIntent, slugify } from './taxonomy';

export async function generateBrief(signal: TopicSignal): Promise<Brief> {
    const cluster = classifyCluster(signal.title);
    const riskLevel = estimateRisk(signal.title);
    const angle = pickAngle(signal.title);
    const intent = pickIntent(signal.title);
    const slug = slugify(signal.title);

    const wordCountTarget = 650 + (slug.length * 13) % 250;
    const fallback: Brief = {
        title: signal.title,
        slug,
        angle,
        audience: 'Health-conscious adults',
        intent,
        cluster,
        riskLevel,
        primaryQuestion: `What should I know about ${signal.title}?`,
        secondaryQuestions: [
            `Why does ${signal.title} matter?`,
            `What can I do this week regarding ${signal.title}?`
        ],
        outline: ['TL;DR', 'Key facts', 'Action steps', 'When to seek care', 'FAQ', 'CTA'],
        actionSteps: ['Pick one small change to start this week', 'Track progress for 7 days', 'Ask a clinician if symptoms persist'],
        safetyNotes: ['Do not provide medical diagnosis or individualized advice', 'Encourage seeking care for alarming symptoms'],
        keywords: [signal.title.toLowerCase()],
        metaTitle: `${signal.title} - Practical Guide`,
        metaDescription: `A concise, actionable guide to ${signal.title} with practical steps and when to seek care.`,
        wordCountTarget,
        ctaType: 'BOOK_CALL'
    };

    if (!process.env.OPENAI_API_KEY) return fallback;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are a senior health content strategist for Present Health. Create a brief for an article with high SEO value and high diversity.

Topic: "${signal.title}"
Source: ${signal.source}
Cluster: ${cluster}
Angle preference: ${angle}
Intent preference: ${intent}
Risk level: ${riskLevel}

Rules:
- Do NOT mention any clinician names or personal names.
- Do NOT over-index on DPC or insurance; save Present Health mention for the CTA only.
- Keep it concise and actionable.
- Output valid JSON only.

Return JSON with:
{
  "title": "...",
  "slug": "...",
  "angle": "...",
  "audience": "...",
  "intent": "...",
  "cluster": "...",
  "riskLevel": "LOW|MEDIUM|HIGH",
  "primaryQuestion": "...",
  "secondaryQuestions": ["..."],
  "outline": ["..."],
  "actionSteps": ["..."],
  "safetyNotes": ["..."],
  "keywords": ["..."],
  "metaTitle": "...",
  "metaDescription": "...",
  "wordCountTarget": ${wordCountTarget},
  "ctaType": "MEMBERSHIP|NEWSLETTER|BOOK_CALL"
}
`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-5.2',
            messages: [
                { role: 'developer', content: 'Return valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4
        } as any);

        const text = response.choices[0]?.message?.content || '';
        const parsed = safeJsonParse(text);
        if (!parsed) return fallback;

        return {
            ...fallback,
            ...parsed,
            slug: parsed.slug ? slugify(parsed.slug) : slug,
            cluster: parsed.cluster || cluster,
            riskLevel: parsed.riskLevel || riskLevel
        } as Brief;
    } catch (error) {
        console.error('Brief generation failed', error);
        return fallback;
    }
}

function safeJsonParse(text: string): any | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}
