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
- Required h2 sections (exact headings, in this order):
  1) Quick answer
  2) TL;DR
  3) Key context
  4) FAQ
  5) How Present Health can help
- Do NOT add extra h2 headings. Use h3 subheadings (###) freely within sections.
- Headings must be on their own lines with a blank line before and after.
- TL;DR: 3-5 bullets. Each must be a complete informative sentence — a real takeaway. Never a question. Never a metadata label like "Focus:" or "Intent:". At least one bullet must state a concrete action.
- Format FAQ strictly as: **Q: [question]** on its own line, then A: [answer] starting the next line. Do NOT bold the "A:" prefix. Every answer must be 2-4 specific, useful sentences. Never write generic filler like "Start with one or two practical steps" or "Discuss with a clinician."
- Do NOT include an H1 or repeat the article title. Start with "## Quick answer".
- Do NOT mention any clinician names or personal names.
- No medical diagnosis or individualized advice.
- Mention Present Health only in the CTA section.
- Use only "How Present Health can help" for the CTA heading.
- Quick answer: 3-4 sentences. Open with a 1-2 sentence direct answer to the primary question that could stand alone as a cited snippet — use specific facts, numbers, or timeframes, not vague advice. Then explain why it matters now using the HOOK, and close with one thing the reader can do.
- Key context is the heart of the article — write 800-1200 words here. Break it into 3-5 h3 subheadings with natural, topic-specific titles (e.g. "### How the pathway works", "### What the evidence shows", "### Who should ask about this"). Explain mechanisms, summarise evidence, and give practical steps. Weave in 1-2 sentences connecting consistent primary care (continuity, longer visits, direct access) to better management of this topic — without naming Present Health.
- Include a "### Key takeaway" callout (1-2 sentences) at the end of Key context that summarizes the most important actionable fact. This should be a self-contained, citable statement.
- Use definition-style phrasing for key terms (e.g., "Sleep apnea is a condition where…") at least once in Key context to support featured snippet and AI extraction.
- FAQ: 3-5 Q&A pairs. Mirror real "People Also Ask" search queries. Every answer must be substantive. Lead each FAQ answer with a direct factual answer in the first sentence before elaborating.
- Total word count: ${brief.wordCountTarget}–${brief.wordCountTarget + 300} words. Articles under 1200 words are too thin and will be rejected. Prioritise depth and specificity.
- SEO: primary keyword in the first paragraph, natural variants in h3 subheadings.
- Cautious phrasing: "may", "can", "is associated with", "some evidence suggests".
- Banned phrases: "will reduce risk", "prevents", "protects", "reverses", "cures", "clinically proven", "most significant protection".
- Disclaimer and emergency guidance are template-handled; omit them.
- How Present Health can help: 3-6 bullets specific to this topic, ONE CTA link (${'/pricing'}).
- Reviewed-by block is template-handled; omit it.

Evidence rules:
- If ALLOWED_SOURCES is empty: do NOT use "research shows/studies show" framing and do NOT include numeric effect sizes or risk percentages. Instead, cite 1-2 authoritative sources (NIH, CDC, WHO, major medical journals) in the content and include them in the JSON response under a "citedSources" array of {title, url} objects.
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
  "content": "Markdown content",
  "citedSources": [{"title": "...", "url": "..."}]
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
