import { Brief, Draft } from './types';

const REQUIRED_SECTIONS = [
    'TL;DR',
    'Action steps this week',
    'When to seek care',
    'FAQ'
];

const BANNED_PHRASES = [
    'guarantee',
    'cure',
    'miracle',
    '24/7',
    'prescription',
    'medication'
];

export function qaDraft(brief: Brief, draft: Draft): Draft {
    let content = draft.content;

    content = removeNames(content);
    content = limitBrandMentions(content);
    content = removeBannedPhrases(content);
    content = ensureRequiredSections(content, brief);
    content = ensureCta(content);
    content = trimToWordCount(content, 1000);

    return {
        ...draft,
        content
    };
}

function removeNames(content: string): string {
    return content.replace(/Dr\.?\s+[A-Z][a-z]+/g, 'a clinician');
}

function limitBrandMentions(content: string): string {
    const occurrences = (content.match(/Present Health/g) || []).length;
    if (occurrences <= 1) return content;

    // Keep the last mention (CTA), replace earlier ones.
    let count = 0;
    return content.replace(/Present Health/g, match => {
        count += 1;
        if (count < occurrences) return 'the practice';
        return match;
    });
}

function removeBannedPhrases(content: string): string {
    let cleaned = content;
    for (const phrase of BANNED_PHRASES) {
        const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }
    return cleaned.replace(/\s{2,}/g, ' ');
}

function ensureRequiredSections(content: string, brief: Brief): string {
    const lower = content.toLowerCase();
    let updated = content;

    for (const section of REQUIRED_SECTIONS) {
        if (!lower.includes(section.toLowerCase())) {
            updated += buildSection(section, brief);
        }
    }

    return updated;
}

function ensureCta(content: string): string {
    if (content.includes('Present Health')) return content;
    return `${content}\n\n## Ready for guidance?\nPresent Health offers virtual primary care focused on clarity and prevention. Book a free intro call to learn more.`;
}

function trimToWordCount(content: string, maxWords: number): string {
    const words = content.split(/\s+/);
    if (words.length <= maxWords) return content;
    return words.slice(0, maxWords).join(' ') + '...';
}

function buildSection(section: string, brief: Brief): string {
    if (section === 'Action steps this week') {
        return `\n\n## Action steps this week\n${brief.actionSteps.map(step => `- ${step}`).join('\n')}`;
    }
    if (section === 'When to seek care') {
        return `\n\n## When to seek care\n- If symptoms are severe, sudden, or worsening.\n- If symptoms interfere with daily life or sleep.\n- If you are unsure or have concerning symptoms.`;
    }
    if (section === 'FAQ') {
        return `\n\n## FAQ\n**Q: ${brief.primaryQuestion}**\nA: Start with one or two practical steps and reassess after a week.`;
    }
    if (section === 'TL;DR') {
        return `\n\n## TL;DR\n${brief.metaDescription}`;
    }
    return '';
}
