import { Brief, Draft } from './types';
import { normalizeMarkdownFromBrief } from './format';
import { getClusterPlaybook, getOverlapNotes, LIFESTYLE_CLUSTERS } from './cluster-rules';
import { stripTemplateOwnedSections, getTemplateOwnedSections, hasTemplateOwnedSection } from './sections';
import { repairMarkdown } from './repair';
import { lintMarkdown } from './lint';

const REQUIRED_SECTIONS = [
    'Quick answer',
    'TL;DR',
    'Key context',
    'FAQ',
    'How Present Health can help'
];

const STRONG_CLAIMS = [
    'will reduce risk',
    'prevents',
    'protects',
    'reverses',
    'cures',
    'clinically proven',
    'most significant protection',
    'guarantee'
];

const RESEARCH_PHRASES = [
    'research shows',
    'studies show',
    'evidence suggests',
    'meta-analysis',
    'randomized',
    'clinical trial'
];

const NUMERIC_CLAIM_PATTERNS = [
    /%/,
    /\bpercent\b/i,
    /\bhazard ratio\b/i,
    /\brelative risk\b/i,
    /\brisk reduction\b/i
];

type QaOptions = {
    reviewLabel?: string;
};

export function qaDraft(brief: Brief, draft: Draft, options: QaOptions = {}): Draft {
    let content = draft.content;

    content = removeNames(content);
    content = softenClaims(content);
    content = limitBrandMentions(content);
    content = repairMarkdown(content);
    content = stripTemplateOwnedSections(content);
    content = stripDeprecatedSections(content);
    content = mergeHelpSections(content);
    content = ensureHook(content, brief);
    content = ensureRequiredSections(content, brief);
    content = upgradeFaqAnswers(content, brief);
    content = normalizeMarkdownFromBrief(content, brief);
    content = splitLongParagraphs(content);
    content = trimToWordCount(content, brief.wordCountTarget + 200);

    const qaFlags = collectQaFlags(content, brief);

    return {
        ...draft,
        content,
        qaFlags
    };
}

function removeNames(content: string): string {
    return content.replace(/Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g, 'a clinician');
}

function limitBrandMentions(content: string): string {
    const occurrences = (content.match(/Present Health/g) || []).length;
    if (occurrences <= 1) return content;

    let count = 0;
    return content.replace(/Present Health/g, match => {
        count += 1;
        if (count < occurrences) return 'the practice';
        return match;
    });
}

function softenClaims(content: string): string {
    let cleaned = content;
    const replacements: Array<[RegExp, string]> = [
        [/\bwill reduce risk\b/gi, 'may reduce risk'],
        [/\bprevents\b/gi, 'may help lower risk of'],
        [/\bprotects\b/gi, 'is associated with lower risk of'],
        [/\breverses\b/gi, 'may improve'],
        [/\bcures\b/gi, 'may help manage'],
        [/\bclinically proven\b/gi, 'supported by some evidence'],
        [/\bmost significant protection\b/gi, 'may be associated with benefit']
    ];
    for (const [pattern, replacement] of replacements) {
        cleaned = cleaned.replace(pattern, replacement);
    }
    return cleaned;
}

function ensureRequiredSections(content: string, brief: Brief): string {
    let updated = content;
    const lower = content.toLowerCase();
    const missing = REQUIRED_SECTIONS.filter(section => !hasSection(lower, section));

    if (missing.length === 0) return updated;

    const prependBlocks = missing.includes('Quick answer')
        ? buildSection('Quick answer', brief)
        : '';
    if (prependBlocks) {
        updated = `${prependBlocks}\n\n${updated}`;
    }

    for (const section of missing) {
        if (section === 'Quick answer') continue;
        updated += `\n\n${buildSection(section, brief)}`;
    }

    return updated;
}

function hasSection(contentLower: string, section: string): boolean {
    const escaped = section.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^##\\s+${escaped}\\b`, 'm');
    return regex.test(contentLower);
}

function buildSection(section: string, brief: Brief): string {
    const cluster = brief.primaryCluster || brief.cluster;
    const playbook = getClusterPlaybook(cluster);
    const secondaryClusters = (brief.secondaryClusters || []).filter(Boolean).slice(0, 2);
    const overlapNotes = getOverlapNotes(secondaryClusters);
    if (section === 'Quick answer') {
        const hook = brief.hook ? ensureSentence(brief.hook) : '';
        const meta = ensureSentence(brief.metaDescription);
        const action = ensureSentence(brief.actionSteps?.[0] || '');
        const combined = [hook, meta, action].filter(Boolean).join(' ');
        return `## Quick answer\n${combined || meta || brief.metaDescription}`;
    }
    if (section === 'TL;DR') {
        const bullets = [
            brief.primaryQuestion,
            playbook.priorityDrivers[0],
            brief.actionSteps[0]
        ].filter(Boolean);
        return `## TL;DR\n${bullets.map(item => `- ${item}`).join('\n')}`;
    }
    if (section === 'Key context') {
        const drivers = playbook.priorityDrivers.map(item => `- ${item}`).join('\n');
        const intro = 'Key context can clarify what actually drives outcomes beyond the headline.';
        const overlap = overlapNotes.length ? `\n\nOverlap considerations: ${overlapNotes.join(' ')}` : '';
        const observationNote = playbook.observationalLimitRequired || LIFESTYLE_CLUSTERS.has(cluster)
            ? '\n\nThe evidence here is largely observational and cannot prove causation.'
            : '';
        return `## Key context\n${intro}\n\n${drivers}${overlap}${observationNote}`;
    }
    if (section === 'Special situations') {
        const bullets = playbook.specialSituations.map(item => `- ${item}`).join('\n');
        const intro = 'These situations can change the plan or the level of urgency.';
        const overlap = overlapNotes.length ? `\n\nAlso consider: ${overlapNotes.join(' ')}` : '';
        return `## Special situations\n${intro}\n\n${bullets}${overlap}`;
    }
    if (section === 'Practical plan') {
        const steps = playbook.practicalPlan.map(item => `- ${item}`).join('\n');
        const checklist = brief.actionSteps.length
            ? `\n- Checklist: ${brief.actionSteps.slice(0, 4).join('; ')}.`
            : '';
        const intro = 'Use this plan to take small, repeatable steps this week.';
        return `## Practical plan\n${intro}\n\n${steps}${checklist}`;
    }
    if (section === 'When to seek care') {
        const urgent = playbook.redFlags.map(item => `- ${item}`).join('\n');
        return `## When to seek care\n### Urgent now\n${urgent}\n### Book soon\n- Symptoms persist or worsen over 2-4 weeks.\n- Functional impairment or rising concern.\n### Routine\n- Preventive review of risk factors or screening plans.`;
    }
    if (section === 'FAQ') {
        const faqQuestions = [
            brief.primaryQuestion,
            ...playbook.faqTargets.slice(0, 2)
        ];
        const secondaryFaq = secondaryClusters.flatMap(clusterName => getClusterPlaybook(clusterName).faqTargets.slice(0, 2));
        const combined = Array.from(new Set([...faqQuestions, ...secondaryFaq])).slice(0, 5);
        return `## FAQ\n${combined.map(question => `**Q: ${question}**\nA: Discuss this with a clinician and track your symptoms for 1-2 weeks.`).join('\n\n')}`;
    }
    if (section === 'How Present Health can help') {
        const bullets = playbook.ctaBullets.map(item => `- ${item}`).join('\n');
        return `## How Present Health can help\n${bullets}\n- [Join / See Pricing](/pricing)`;
    }

    return '';
}

function collectQaFlags(content: string, brief: Brief): string[] {
    const flags: string[] = [];
    const lower = content.toLowerCase();
    const cluster = brief.primaryCluster || brief.cluster;
    const allowedSources = Array.isArray(brief.allowedSources) ? brief.allowedSources : [];
    const templateSections = getTemplateOwnedSections();

    for (const section of REQUIRED_SECTIONS) {
        if (!hasSection(lower, section)) {
            flags.push(`Missing required section: ${section}`);
        }
    }

    for (const section of templateSections) {
        if (hasTemplateOwnedSection(content, section)) {
            flags.push(`Template-owned section should not be in body: ${section}`);
        }
    }

    if (!/## quick answer/i.test(content) || lower.indexOf('## quick answer') > lower.indexOf('## tl;dr')) {
        flags.push('Quick answer missing or not near top');
    }


    const tldrMatch = content.match(/##\s+TL;DR([\s\S]*?)(?=##\s|$)/i);
    if (tldrMatch) {
        const bullets = tldrMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
        if (bullets.length < 3 || bullets.length > 5) {
            flags.push('TL;DR should contain 3-5 bullets');
        }
        const actionVerbs = ['start', 'aim', 'track', 'limit', 'avoid', 'schedule', 'plan', 'check'];
        const hasAction = bullets.some(bullet => actionVerbs.some(verb => bullet.toLowerCase().includes(verb)));
        if (!hasAction) {
            flags.push('TL;DR missing an action-oriented bullet');
        }
    } else {
        flags.push('Missing TL;DR section');
    }

    const lintIssues = lintMarkdown(content);
    flags.push(...lintIssues);

    for (const phrase of STRONG_CLAIMS) {
        if (lower.includes(phrase)) {
            flags.push(`Banned claim language detected: "${phrase}"`);
        }
    }

    if (allowedSources.length === 0) {
        for (const phrase of RESEARCH_PHRASES) {
            if (lower.includes(phrase)) {
                flags.push('Research language used without allowed sources');
                break;
            }
        }
        if (NUMERIC_CLAIM_PATTERNS.some(pattern => pattern.test(content))) {
            flags.push('Numeric/statistical claim detected without allowed sources');
        }
    }

    if (LIFESTYLE_CLUSTERS.has(cluster)) {
        if (!/observational/.test(lower) || !/causation/.test(lower)) {
            flags.push('Missing observational evidence limitation statement for lifestyle topic');
        }
    }

    const presentHealthMentions = (content.match(/Present Health/g) || []).length;
    if (presentHealthMentions > 1) {
        flags.push('Overly salesy CTA (multiple brand mentions)');
    }

    return flags;
}

function trimToWordCount(content: string, maxWords: number): string {
    const words = content.split(/\s+/);
    if (words.length <= maxWords) return content;
    const actionIdx = content.toLowerCase().indexOf('## practical plan');
    if (actionIdx > 0) {
        const head = content.slice(0, actionIdx).trim();
        const tail = content.slice(actionIdx).trim();
        const tailWords = tail.split(/\s+/).length;
        const headWords = head.split(/\s+/);
        const available = Math.max(maxWords - tailWords, Math.floor(maxWords * 0.6));
        const trimmedHead = headWords.slice(0, Math.max(0, available)).join(' ');
        return trimmedHead ? `${trimmedHead}\n\n${tail}` : tail;
    }
    return words.slice(0, maxWords).join(' ') + '...';
}

function splitLongParagraphs(content: string): string {
    const paragraphs = content.split(/\n{2,}/);
    const updated = paragraphs.map((paragraph) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return paragraph;
        if (/^(#{1,6}\s|[-*]\s|>|\|)/.test(trimmed)) return paragraph;
        if (trimmed.length < 420) return paragraph;

        const sentences = trimmed.split(/(?<=[.!?])\s+/);
        if (sentences.length < 3) return paragraph;

        const chunks: string[] = [];
        let current: string[] = [];
        for (const sentence of sentences) {
            current.push(sentence.trim());
            if (current.length >= 2) {
                chunks.push(current.join(' '));
                current = [];
            }
        }
        if (current.length) {
            chunks.push(current.join(' '));
        }
        return chunks.join('\n\n');
    });

    return updated.join('\n\n');
}

function upgradeFaqAnswers(content: string, brief: Brief): string {
    // Match placeholder answers regardless of bold markdown formatting around "A:"
    // e.g. "A: ...", "**A:** ...", "**A: ...**"
    const A = String.raw`\*{0,2}A:\*{0,2}`;
    const genericPatterns = [
        new RegExp(`${A}\\s*Start with one or two practical steps and reassess after a week\\.?\\*{0,2}`, 'gi'),
        new RegExp(`${A}\\s*Start with one or two small actions and reassess after a week\\.?\\*{0,2}`, 'gi'),
        new RegExp(`${A}\\s*Start with one or two small actions[,]? (?:and )?track how you feel for a week[^.]*\\.\\*{0,2}`, 'gi'),
        // buildSection FAQ fallback (added by ensureRequiredSections when FAQ is missing)
        new RegExp(`${A}\\s*Discuss this with a clinician and track your symptoms for 1-2 weeks\\.?\\*{0,2}`, 'gi'),
    ];
    const cluster = brief.primaryCluster || brief.cluster;
    const playbook = getClusterPlaybook(cluster);
    const driverA = playbook.priorityDrivers[0] || 'context and history';
    const driverB = playbook.priorityDrivers[1] || 'pattern tracking';
    const rawAction = brief.actionSteps?.[0] || 'track your symptoms and context for 1-2 weeks';
    // Normalise action step to gerund form so "Start by track..." doesn't happen
    const actionPhrase = rawAction
        .replace(/^start with\s+/i, '')
        .replace(/^track\b/i, 'tracking')
        .replace(/^log\b/i, 'logging')
        .replace(/^monitor\b/i, 'monitoring')
        .replace(/^schedule\b/i, 'scheduling');
    const replacement = `A: The short answer depends on ${lowerFirst(driverA)} and ${lowerFirst(driverB)}. Start by ${lowerFirst(actionPhrase)} and review your findings with a clinician if questions remain or symptoms change.`;

    let updated = content;
    for (const pattern of genericPatterns) {
        updated = updated.replace(pattern, replacement);
    }
    return updated;
}

function lowerFirst(value: string) {
    if (!value) return value;
    return value.charAt(0).toLowerCase() + value.slice(1);
}

function stripDeprecatedSections(content: string): string {
    const sections = ['Special situations', 'Practical plan', 'When to seek care', 'What matters more than the headline'];
    const escaped = sections.map(section => section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!escaped) return content;
    const pattern = new RegExp(`^##\\s+(${escaped})\\b[\\s\\S]*?(?=\\n##\\s|$)`, 'gmi');
    return content.replace(pattern, '').replace(/\n{3,}/g, '\n\n').trim();
}

function mergeHelpSections(content: string): string {
    const helpPattern = /^##\s+(How Present Health can help|How the practice can help)\b([\s\S]*?)(?=\n##\s|$)/gmi;
    const matches = Array.from(content.matchAll(helpPattern));
    if (matches.length === 0) {
        return content;
    }

    const bodies = matches.map(match => (match[2] || '').trim()).filter(Boolean);
    const mergedBody = mergeHelpBodies(bodies);

    let cleaned = content.replace(helpPattern, '').replace(/\n{3,}/g, '\n\n').trim();
    if (!mergedBody) {
        return cleaned;
    }

    return `${cleaned}\n\n## How Present Health can help\n${mergedBody}`.trim();
}

function mergeHelpBodies(bodies: string[]): string {
    if (bodies.length === 0) return '';
    const lines = bodies.join('\n').split('\n');
    const output: string[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            if (output.length && output[output.length - 1] !== '') {
                output.push('');
            }
            continue;
        }
        const normalized = trimmed.replace(/\s+/g, ' ').toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        if (/^[-*]\s+/.test(trimmed)) {
            output.push(`- ${trimmed.replace(/^[-*]\s+/, '')}`);
        } else {
            output.push(trimmed);
        }
    }
    return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function ensureHook(content: string, brief: Brief): string {
    const hook = ensureSentence((brief.hook || '').trim());
    if (!hook) return content;
    const pattern = /##\s+Quick answer([\s\S]*?)(?=\n##\s|$)/i;
    const match = content.match(pattern);
    if (!match) return content;
    const body = match[1].trim();
    const hadHookLabel = /^Hook:\s*/i.test(body);
    const cleanedBody = body.replace(/^Hook:\s*/i, '').trim();
    const lower = cleanedBody.toLowerCase();
    if (lower.includes(hook.toLowerCase()) && !hadHookLabel) {
        return content;
    }
    const updatedBody = hadHookLabel ? cleanedBody : `${hook}\n\n${cleanedBody}`;
    return content.replace(pattern, `## Quick answer\n${updatedBody}\n`);
}

function ensureSentence(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/[.!?]$/.test(trimmed)) return trimmed;
    return `${trimmed}.`;
}

/**
 * Returns true when the content looks like it was produced by buildFallbackContent()
 * rather than a successful AI generation. Used by the engine to discard articles
 * that would publish near-empty stub content.
 */
export function isFallbackContent(content: string): boolean {
    // TL;DR bullets that expose internal brief metadata (angle/intent fields)
    const tldrMatch = content.match(/##\s+TL;DR([\s\S]*?)(?=##\s|$)/i);
    if (tldrMatch && /^\s*-\s*(Focus:|Intent:)/im.test(tldrMatch[1])) return true;

    // Key context body that is a known placeholder string or dangerously thin
    const keyContextMatch = content.match(/##\s+Key context([\s\S]*?)(?=##\s|$)/i);
    if (keyContextMatch) {
        const body = keyContextMatch[1].trim();
        if (/Key context (helps|can) clarify/i.test(body)) return true;
        if (/Track patterns and triggers that matter most/i.test(body)) return true;
        if (/More detail on this topic is being generated/i.test(body)) return true;
        // Strip markdown symbols and count real words
        const wordCount = body.replace(/[-*#>\[\]()!]/g, '').split(/\s+/).filter(Boolean).length;
        if (wordCount < 40) return true;
    }

    return false;
}
