import OpenAI from 'openai';
import { Brief, Draft } from './types';

export async function generateDraft(brief: Brief): Promise<Draft> {
    const fallback: Draft = {
        title: brief.title,
        excerpt: `A concise, actionable overview of ${brief.title}.`,
        metaTitle: brief.metaTitle,
        metaDescription: brief.metaDescription,
        content: buildFallbackContent(brief)
    };

    if (!process.env.OPENAI_API_KEY) return fallback;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
Write a concise, high-utility health article based on this brief.

BRIEF:
${JSON.stringify(brief, null, 2)}

Rules:
- Use Markdown.
- Sections required: "TL;DR", "Action steps this week", "When to seek care", and "FAQ".
- Do NOT mention any clinician names or personal names.
- Do NOT include medical diagnosis or individualized advice.
- Mention Present Health only in the final CTA section.
- Keep word count around ${brief.wordCountTarget} (600-900 ok).
- Avoid hype, avoid guarantees, avoid prescriptions/medication language.

Return JSON only:
{
  "title": "...",
  "excerpt": "1-2 sentences",
  "metaTitle": "...",
  "metaDescription": "...",
  "content": "Markdown content"
}
`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-5.2',
            messages: [
                { role: 'developer', content: 'You write factual, concise health content. Return JSON only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5
        } as any);

        const text = response.choices[0]?.message?.content || '';
        const parsed = safeJsonParse(text);
        if (!parsed) return fallback;

        return {
            ...fallback,
            ...parsed
        } as Draft;
    } catch (error) {
        console.error('Draft generation failed', error);
        return fallback;
    }
}

function buildFallbackContent(brief: Brief): string {
    return `# ${brief.title}

## TL;DR
${brief.metaDescription}

## Key points
- ${brief.primaryQuestion}
- ${brief.secondaryQuestions[0] || 'Focus on practical steps'}

## Action steps this week
${brief.actionSteps.map(step => `- ${step}`).join('\n')}

## When to seek care
- If symptoms are severe, sudden, or worsening.
- If symptoms interfere with daily life or sleep.

## FAQ
**Q: ${brief.primaryQuestion}**
A: Start with one or two small actions and reassess after a week.

## Ready for guidance?
Present Health offers virtual primary care with a focus on prevention and clarity. Book a free intro call to learn more.
`;
}

function safeJsonParse(text: string): any | null {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}
