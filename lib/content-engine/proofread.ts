import { Brief, Draft } from './types';
import { generateJson } from './gemini';

export async function proofreadDraft(brief: Brief, draft: Draft): Promise<Draft | null> {
    const prompt = `
You are a meticulous medical copy editor. Improve the draft for clarity, concision, and formatting without adding new claims.

STRICT RULES:
- Preserve the required section headings and order.
- Keep the draft concise and readable.
- Remove duplicate sentences/paragraphs and repeated lines.
- Remove empty bullet points.
- Ensure each major section (except TL;DR) includes at least one short paragraph before any bullets.
- TL;DR must remain 3-5 bullet points and should NOT contain paragraphs.
- FAQ answers must be specific and helpful; never use generic filler like “Start with one or two practical steps...”.
- Do NOT add an H1, and do NOT repeat the article title in the body.
- Do NOT include education disclaimer, emergency guidance, or reviewed-by blocks.
- Do NOT add clinician names or personalized medical advice.
- Avoid hype/guarantees; keep cautious language.

BRIEF (for context only):
${JSON.stringify({ title: brief.title, primaryCluster: brief.primaryCluster || brief.cluster, secondaryClusters: brief.secondaryClusters || [] }, null, 2)}

DRAFT JSON:
${JSON.stringify(draft, null, 2)}

Return JSON only with the same keys:
{
  "title": "...",
  "excerpt": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "content": "Markdown content"
}
`;

    const revised = await generateJson<any>(prompt, 0.2);
    if (!revised) return null;
    return {
        ...draft,
        ...revised
    } as Draft;
}
