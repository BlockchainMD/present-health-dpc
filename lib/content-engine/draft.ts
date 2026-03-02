import { Brief, Draft } from './types';
import { generateJson } from './gemini';
import { proofreadDraft } from './proofread';
import { getClusterPlaybook, getOverlapNotes, LIFESTYLE_CLUSTERS } from './cluster-rules';

export async function generateDraft(brief: Brief): Promise<Draft> {
    const fallback: Draft = {
        title: brief.title,
        excerpt: `A concise, actionable overview of ${brief.title}.`,
        metaTitle: brief.metaTitle,
        metaDescription: brief.metaDescription,
        content: buildFallbackContent(brief)
    };

    const cluster = brief.primaryCluster || brief.cluster;
    const secondaryClusters = (brief.secondaryClusters || []).filter(Boolean).slice(0, 2);
    const allowedSources = Array.isArray(brief.allowedSources) ? brief.allowedSources : [];
    const playbook = getClusterPlaybook(cluster);
    const overlapNotes = getOverlapNotes(secondaryClusters);
    const observationalNoteRequired = playbook.observationalLimitRequired || LIFESTYLE_CLUSTERS.has(cluster);

    const prompt = `
Write a concise, high-utility health article based on this brief. Output must be cluster-aware, safety-first, and easy to review.

BRIEF:
${JSON.stringify(brief, null, 2)}

PRIMARY_CLUSTER: ${cluster}
SECONDARY_CLUSTERS: ${secondaryClusters.join(', ') || 'none'}
ALLOWED_SOURCES: ${allowedSources.length ? allowedSources.join(', ') : 'none'}
HOOK: ${brief.hook || 'none'}

Cluster playbook (must be reflected in content):
- Priority drivers: ${playbook.priorityDrivers.join('; ')}
- Red flags: ${playbook.redFlags.join('; ')}
- Special situations: ${playbook.specialSituations.join('; ')}
- Practical plan elements: ${playbook.practicalPlan.join('; ')}
- CTA tie-ins: ${playbook.ctaBullets.join('; ')}
- FAQ focus: ${playbook.faqTargets.join('; ')}
${overlapNotes.length ? `- Overlap notes to address: ${overlapNotes.join(' ')}` : ''}

Rules:
- Use Markdown.
- Sections required (exact headings):
  1) Quick answer
  2) TL;DR
  3) Key context
  4) FAQ
  5) How Present Health can help
- Do NOT add any other section headings.
- Headings must be on their own lines with a blank line before and after.
- TL;DR must be 3-5 bullets with at least one action-oriented bullet.
- Each major section must include at least one short paragraph; use bullets only where they add clarity.
- Avoid empty bullet points or lists made entirely of single-sentence bullets.
- Format FAQ as separate Q/A pairs (each Q on its own line, with a blank line between pairs).
- Do NOT include an H1 or repeat the article title in the body. Start with "## Quick answer".
- Do NOT mention any clinician names or personal names.
- Do NOT include medical diagnosis or individualized advice.
- Mention Present Health only in the final CTA section.
- Use only the heading "How Present Health can help" for the CTA section (do not write "How the practice can help").
- Start the Quick answer with a 1-2 sentence hook that reflects the HOOK above, then add 1 sentence on why it matters and 1 sentence on what a reader can do.
- Key context must be the longest section and do the heavy lifting: explain why the hook matters now or is under-discussed in plain language, then give 2-4 simple, non-medical steps readers can consider.
- Include 1-2 subtle sentences in the body that connect the topic to the value of direct primary care (e.g., continuity, access, longer visits), without sounding salesy and without naming Present Health.
- Make the writing punchy and concise: short paragraphs (1-2 sentences, max 3), active voice, minimal filler.
- Keep word count around ${brief.wordCountTarget} (450-700 ok).
- Front-load value (no long scene-setting). Make every section practical and skimmable.
- Use SEO best practices: primary keyword in the first paragraph, natural keyword variants in headings, and a compact FAQ with 3-5 questions.
- Avoid hype, avoid guarantees, avoid prescriptions/medication language.
- Default to cautious phrasing: "may", "can", "is associated with", "some evidence suggests".
- Ban strong causality/guarantees: "will reduce risk", "prevents", "protects", "reverses", "cures", "clinically proven", "most significant protection".
- Education disclaimer and emergency guidance are handled by the template; do not include them.
- Quick answer must be 2-3 sentences and appear near the top.
- How Present Health can help must include 3-6 bullets and ONE CTA link (e.g., ${'/pricing'}).
- Reviewed-by block is handled by the template; do not include it.

Evidence rules:
- If ALLOWED_SOURCES is empty: do NOT use "research shows/studies show" framing and do NOT include numeric effect sizes or risk percentages.
- If ALLOWED_SOURCES is provided: any research/numeric claim MUST map to those sources.
${observationalNoteRequired ? '- Include: "The evidence here is largely observational and cannot prove causation." in Key context.' : ''}

If secondary clusters exist:
- Add 1-2 FAQ questions per secondary cluster (max 2 clusters).
- Add 1 paragraph in "Key context" that addresses the overlap.

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

        let draft = {
            ...fallback,
            ...parsed
        } as Draft;
        try {
            const revised = await proofreadDraft(brief, draft);
            if (revised) {
                draft = { ...draft, ...revised };
            }
        } catch (error) {
            console.warn('Draft proofread failed', error);
        }

        return draft;
    } catch (error) {
        console.error('Draft generation failed', error);
        return fallback;
    }
}

function buildFallbackContent(brief: Brief): string {
    const secondary = brief.secondaryQuestions.filter(Boolean);
    const faqQuestion = secondary[0] || brief.primaryQuestion;
    const hookSentence = ensureSentence(brief.hook || `An under-discussed aspect of ${brief.title} deserves more attention.`);
    const actionSentence = ensureSentence(brief.actionSteps?.[0] || 'Pick one small change to start this week and track it.');
    const actionTwo = ensureSentence(brief.actionSteps?.[1] || 'Ask a clinician if symptoms persist or change.');
    return `## Quick answer
${hookSentence} ${ensureSentence(brief.metaDescription)} ${actionSentence}

## TL;DR
- ${brief.primaryQuestion}
- ${actionSentence}
- ${actionTwo}

## Key context
More detail on this topic is being generated. Check back soon.

## FAQ
**Q: ${faqQuestion}**
A: The answer depends on individual context. Track relevant symptoms for 1–2 weeks and review findings with a clinician.

## How Present Health can help
- Personalized prevention planning
- Longer visits for nuanced decisions
- Coordination for tests and referrals
- [Join / See Pricing](/pricing)

`;
}

function ensureSentence(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/[.!?]$/.test(trimmed)) return trimmed;
    return `${trimmed}.`;
}
