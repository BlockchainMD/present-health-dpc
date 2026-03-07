import { Brief, TopicSignal } from './types';
import { classifyClusters, estimateRisk, pickAngle, pickIntent, slugify, cleanTopicTitle } from './taxonomy';
import { generateJson } from './gemini';

export async function generateBrief(signal: TopicSignal): Promise<Brief> {
    const cleanedTitle = cleanTopicTitle(signal.title);
    const topic = trimTopic(cleanedTitle, 90);
    const clusterMatch = classifyClusters(cleanedTitle);
    const cluster = clusterMatch.primary;
    const riskLevel = estimateRisk(cleanedTitle);
    const angle = pickAngle(cleanedTitle);
    const intent = pickIntent(cleanedTitle);
    const slug = slugify(cleanedTitle);

    const wordCountTarget = 1500 + (slug.length * 7) % 400;
    const hook = buildHook(signal, topic);
    const fallback: Brief = {
        title: cleanedTitle || signal.title,
        slug,
        angle,
        audience: 'Health-conscious adults',
        intent,
        cluster,
        primaryCluster: clusterMatch.primary,
        secondaryClusters: clusterMatch.secondary,
        riskLevel,
        hook,
        primaryQuestion: `What should I know about ${topic}?`,
        secondaryQuestions: [
            `Why does ${topic} matter?`,
            `What can I do this week regarding ${topic}?`
        ],
        outline: [
            'Quick answer',
            'TL;DR',
            'Key context',
            'FAQ',
            'How Present Health can help'
        ],
        actionSteps: ['Pick one small change to start this week', 'Track progress for 7 days', 'Ask a clinician if symptoms persist'],
        safetyNotes: ['Do not provide medical diagnosis or individualized advice', 'Encourage seeking care for alarming symptoms'],
        keywords: [topic.toLowerCase()],
        metaTitle: trimMetaTitle(`${topic}: What to Know in ${new Date().getFullYear()}`),
        metaDescription: trimMetaDescription(`A concise, actionable guide to ${topic} with key context and practical takeaways.`),
        wordCountTarget,
        ctaType: 'BOOK_CALL',
        allowedSources: signal.url ? [signal.url] : []
    };

    const prompt = `
You are a senior health content strategist for Present Health. Create a brief for an original health article.

The topic below comes from a signal source (news, research, trend, etc.). Your job is to TRANSFORM it into a patient-facing health explainer topic — NOT to cover the source story itself.

SIGNAL TOPIC: "${cleanedTitle || signal.title}"
SIGNAL SOURCE TYPE: ${signal.source}
Cluster: ${cluster}
Angle preference: ${angle}
Intent preference: ${intent}
Primary cluster: ${clusterMatch.primary}
Secondary clusters: ${clusterMatch.secondary.join(', ') || 'none'}
Allowed sources: ${signal.url || 'none'}
Risk level: ${riskLevel}

Rules:
- The article TITLE must be an original, patient-facing health topic title — NOT the signal headline. Reframe the underlying health question for a general audience.
- Do NOT mention any clinician names or personal names.
- Do NOT reference the source article, news outlet, or journalist framing.
- Do NOT over-index on DPC or insurance; save Present Health mention for the CTA only.
- Keep it concise, punchy, and actionable. Prefer short headings, tight phrasing, and 1-2 sentence paragraphs.
- The hook must explain why this health topic matters to patients right now — NOT reference media coverage.
- Optimize for SEO with a clear primary keyword, 3-6 secondary keywords, and "People Also Ask" style questions.
- metaTitle should be compelling and click-worthy (50-60 chars). Use formats like: "[Topic]: What to Know in ${new Date().getFullYear()}", "[Number] Things About [Topic] Your Doctor Wants You to Know", "[Topic] Explained: Causes, Symptoms & What to Do". Never use generic suffixes like "Practical guide".
- Include a subtle, topic-relevant DPC value hook in the outline or action steps (e.g., continuity, longer visits, direct access) without naming Present Health.
- Output valid JSON only.

Return JSON with:
{
  "title": "...",
  "slug": "...",
  "angle": "...",
  "audience": "...",
  "intent": "...",
  "cluster": "...",
  "primaryCluster": "...",
  "secondaryClusters": ["..."],
  "riskLevel": "LOW|MEDIUM|HIGH",
  "hook": "...",
  "primaryQuestion": "...",
  "secondaryQuestions": ["..."],
  "outline": ["..."],
  "actionSteps": ["..."],
  "safetyNotes": ["..."],
  "keywords": ["..."],
  "metaTitle": "...",
  "metaDescription": "...",
  "wordCountTarget": ${wordCountTarget},
  "ctaType": "MEMBERSHIP|NEWSLETTER|BOOK_CALL",
  "allowedSources": ["..."]
}
`;

    try {
        const parsed = await generateJson<any>(prompt, 0.4);
        if (!parsed) return fallback;

        const normalizedWordCount = clampNumber(parsed.wordCountTarget ?? wordCountTarget, 1500, 2200);

        return {
            ...fallback,
            ...parsed,
            slug: parsed.slug ? slugify(parsed.slug) : slug,
            cluster: clusterMatch.primary,
            primaryCluster: clusterMatch.primary,
            secondaryClusters: clusterMatch.secondary,
            riskLevel: parsed.riskLevel || riskLevel,
            wordCountTarget: normalizedWordCount,
            allowedSources: Array.isArray(parsed.allowedSources) ? parsed.allowedSources : fallback.allowedSources,
            hook: typeof parsed.hook === 'string' && parsed.hook.trim().length > 0 ? parsed.hook.trim() : hook
        } as Brief;
    } catch (error) {
        console.error('Brief generation failed', error);
        return fallback;
    }
}

function trimTopic(topic: string, max: number) {
    if (topic.length <= max) return topic;
    return `${topic.slice(0, max - 1).trim()}…`;
}

function buildHook(signal: TopicSignal, topic: string) {
    // Hooks are seed prompts for the AI — they should frame WHY the underlying
    // health topic matters, NOT reference news headlines or source material.
    const kind = signal.kind;
    if (kind === 'trend') {
        return `People are actively searching for clearer answers on this topic — write about the underlying health question, not the search trend itself.`;
    }
    if (kind === 'news') {
        return `This topic is timely because of recent developments. Focus on the health implications for patients, not the news coverage.`;
    }
    if (kind === 'research') {
        return `New evidence is adding nuance to this topic. Explain what the findings mean for day-to-day health decisions.`;
    }
    if (kind === 'trial') {
        return `Clinical trial activity signals growing focus on real-world outcomes for this topic.`;
    }
    if (kind === 'guideline') {
        return `Guideline updates are shifting how clinicians approach this topic — explain what changed and why it matters for patients.`;
    }
    return `This topic has outsized impact on everyday health decisions and deserves a clear, original explainer.`;
}

function trimMetaTitle(title: string) {
    return title.length <= 65 ? title : `${title.slice(0, 62).trim()}…`;
}

function trimMetaDescription(desc: string) {
    return desc.length <= 155 ? desc : `${desc.slice(0, 152).trim()}…`;
}

function clampNumber(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}
