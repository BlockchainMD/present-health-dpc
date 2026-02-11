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

    const wordCountTarget = 520 + (slug.length * 7) % 140;
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
        metaTitle: trimMetaTitle(`${topic}: Practical guide`),
        metaDescription: trimMetaDescription(`A concise, actionable guide to ${topic} with key context and practical takeaways.`),
        wordCountTarget,
        ctaType: 'BOOK_CALL',
        allowedSources: signal.url ? [signal.url] : []
    };

    const prompt = `
You are a senior health content strategist for Present Health. Create a brief for an article with high SEO value and high diversity.

Topic: "${cleanedTitle || signal.title}"
Source: ${signal.source}
Hook seed: ${hook}
Cluster: ${cluster}
Angle preference: ${angle}
Intent preference: ${intent}
Primary cluster: ${clusterMatch.primary}
Secondary clusters: ${clusterMatch.secondary.join(', ') || 'none'}
Allowed sources: ${signal.url || 'none'}
Risk level: ${riskLevel}

Rules:
- Do NOT mention any clinician names or personal names.
- Do NOT over-index on DPC or insurance; save Present Health mention for the CTA only.
- Keep it concise, punchy, and actionable. Prefer short headings, tight phrasing, and 1-2 sentence paragraphs.
- The hook must be a specific, thought-provoking nugget (1-2 sentences) that explains why this topic is timely or under-discussed.
- Optimize for SEO with a clear primary keyword, 3-6 secondary keywords, and "People Also Ask" style questions.
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

        const normalizedWordCount = clampNumber(parsed.wordCountTarget ?? wordCountTarget, 450, 700);

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
    const publishedAt = signal.publishedAt ? new Date(signal.publishedAt) : null;
    const ageDays = publishedAt ? (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24) : null;
    const isRecent = ageDays !== null && ageDays <= 30;
    const isVeryRecent = ageDays !== null && ageDays <= 7;
    const timing = isVeryRecent ? 'this week' : isRecent ? 'this month' : '';
    const kind = signal.kind;
    if (kind === 'trend') {
        if (isRecent) {
            return `Search interest in ${topic} is rising ${timing}, suggesting people are actively looking for clearer answers.`;
        }
        return `Search interest in ${topic} keeps resurfacing, suggesting people are still looking for clearer answers.`;
    }
    if (kind === 'news') {
        if (isRecent) {
            return `Coverage on ${topic} ${timing} is bringing renewed attention to a topic many patients still find confusing.`;
        }
        return `Even outside the headlines, ${topic} remains confusing for many patients and deserves a clear explainer.`;
    }
    if (kind === 'research') {
        if (isRecent) {
            return `New research on ${topic} ${timing} is adding nuance to what actually matters for day-to-day decisions.`;
        }
        return `Evidence on ${topic} keeps evolving, and the practical takeaways are easy to miss.`;
    }
    if (kind === 'trial') {
        if (isRecent) {
            return `Clinical trial activity around ${topic} ${timing} signals growing focus on real-world outcomes.`;
        }
        return `Trial activity around ${topic} suggests the field is still searching for clearer real-world answers.`;
    }
    if (kind === 'guideline') {
        if (isRecent) {
            return `Guideline updates around ${topic} ${timing} are shifting how clinicians frame everyday decisions.`;
        }
        return `Guidelines on ${topic} keep shifting, making it hard to know which everyday choices matter most.`;
    }
    return `An under-discussed aspect of ${topic} has outsized impact on everyday health decisions.`;
}

function trimMetaTitle(title: string) {
    return title.length <= 60 ? title : `${title.slice(0, 57).trim()}…`;
}

function trimMetaDescription(desc: string) {
    return desc.length <= 155 ? desc : `${desc.slice(0, 152).trim()}…`;
}

function clampNumber(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
}
