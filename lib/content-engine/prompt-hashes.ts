import crypto from 'crypto';

/**
 * Stable prompt template fingerprints.
 *
 * These strings capture the invariant instruction skeleton of each prompt.
 * When the prompt rules/format change, update the corresponding constant so
 * the hash rolls over and future articles carry the new fingerprint.
 */

const BRIEF_TEMPLATE_SKELETON = `
You are a senior health content strategist for Present Health. Create a brief for an original health article.
Rules:
- The article TITLE must be an original, patient-facing health topic title
- Do NOT mention any clinician names or personal names
- Do NOT reference the source article, news outlet, or journalist framing
- Keep it concise, punchy, and actionable
- Optimize for SEO with a clear primary keyword
- Include a subtle, topic-relevant DPC value hook
Return JSON with: title, slug, angle, audience, intent, cluster, primaryCluster, secondaryClusters,
riskLevel, hook, primaryQuestion, secondaryQuestions, outline, actionSteps, safetyNotes, keywords,
metaTitle, metaDescription, wordCountTarget, ctaType, allowedSources
`;

const DRAFT_TEMPLATE_SKELETON = `
Write an original, high-utility health article inspired by the topic below.
CRITICAL ORIGINALITY RULES: health educator, not journalist.
Required h2 sections: Quick answer, TL;DR, Key context, FAQ, How Present Health can help.
Evidence rules: cautious phrasing, banned phrases, attribution to source bodies.
Return JSON: title, excerpt, metaTitle, metaDescription, content, citedSources.
`;

function hashTemplate(template: string): string {
    return crypto.createHash('sha256').update(template).digest('hex').slice(0, 8);
}

export const BRIEF_PROMPT_HASH = hashTemplate(BRIEF_TEMPLATE_SKELETON);
export const DRAFT_PROMPT_HASH = hashTemplate(DRAFT_TEMPLATE_SKELETON);
