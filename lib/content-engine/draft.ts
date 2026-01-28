import { Brief, Draft } from './types';
import { generateJson } from './gemini';

export async function generateDraft(brief: Brief): Promise<Draft> {
    const fallback: Draft = {
        title: brief.title,
        excerpt: `A concise, actionable overview of ${brief.title}.`,
        metaTitle: brief.metaTitle,
        metaDescription: brief.metaDescription,
        content: buildFallbackContent(brief)
    };

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
        const parsed = await generateJson<any>(prompt, 0.5);
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
    const secondary = brief.secondaryQuestions.filter(Boolean);
    const faqQuestion = secondary[0] || brief.primaryQuestion;
    const angleLine = brief.angle ? `Focus: ${brief.angle}.` : 'Focus: practical, evidence-informed actions.';
    const intentLine = brief.intent ? `Intent: ${brief.intent}.` : 'Intent: actionable guidance.';

    return `# ${brief.title}

## TL;DR
${brief.metaDescription}

## Why this matters
- ${angleLine}
- ${intentLine}
- ${brief.primaryQuestion}

## Action steps this week
${brief.actionSteps.map(step => `- ${step}`).join('\n')}

## When to seek care
- If symptoms are severe, sudden, or worsening.
- If symptoms interfere with daily life, function, or sleep.
- If you feel unsure or the pattern is changing.

## FAQ
**Q: ${faqQuestion}**
A: Start with one or two small actions, track how you feel for a week, and adjust as needed.

## Ready for guidance?
Present Health offers virtual primary care focused on clarity and prevention. Book a free intro call to learn more.
`;
}
