type HeadingAlias = {
    heading: string;
    aliases: string[];
};

const HEADING_ALIASES: HeadingAlias[] = [
    { heading: 'Education disclaimer', aliases: ['education disclaimer'] },
    { heading: 'Emergency guidance', aliases: ['emergency guidance'] },
    { heading: 'Quick answer', aliases: ['quick answer'] },
    { heading: 'TL;DR', aliases: ['tl;dr', 'tldr'] },
    { heading: 'Key context', aliases: ['key context', 'what matters more than the headline', 'what matters more'] },
    { heading: 'Special situations', aliases: ['special situations'] },
    { heading: 'Practical plan', aliases: ['practical plan', 'action steps this week', 'action steps', 'plan'] },
    { heading: 'When to seek care', aliases: ['when to seek care', 'when to seek help'] },
    { heading: 'FAQ', aliases: ['faq', 'faqs'] },
    { heading: 'How Present Health can help', aliases: ['how present health can help', 'how the practice can help', 'how we can help', 'how present health helps', 'how the practice helps'] },
    { heading: 'Reviewed by', aliases: ['reviewed by'] }
];

// Legacy subheadings from old article format. "routine" removed because it's
// a common health word that causes false-positive mid-sentence breaks.
const SUBHEADINGS = ['urgent now', 'book soon'];
const INLINE_HEADING_TERMS = [
    'Quick answer',
    'TL;DR',
    'Key context',
    'What matters more than the headline',
    'Special situations',
    'Practical plan',
    'Action steps this week',
    'When to seek care',
    'FAQ',
    'How Present Health can help',
    'Education disclaimer',
    'Emergency guidance',
    'Reviewed by'
];

export function repairMarkdown(content: string) {
    if (!content) return content;
    const normalized = insertSectionBreaks(content.replace(/\r\n/g, '\n'));
    const lines = normalized.split('\n');
    const repaired: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            repaired.push(line);
            continue;
        }
        if (trimmed.startsWith('##') || trimmed.startsWith('###')) {
            repaired.push(line);
            continue;
        }
        if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
            repaired.push(line);
            continue;
        }

        const lowered = trimmed.toLowerCase();

        const subMatch = SUBHEADINGS.find(sub => lowered.startsWith(sub));
        if (subMatch) {
            const rest = trimmed.slice(subMatch.length).trim().replace(/^[:\-–—]\s*/, '');
            repaired.push(`### ${capitalize(subMatch)}`);
            if (rest) repaired.push(rest);
            continue;
        }

        let matched = false;
        for (const entry of HEADING_ALIASES) {
            const alias = entry.aliases.find(a => lowered.startsWith(a));
            if (alias) {
                const rest = trimmed.slice(alias.length).trim().replace(/^[:\-–—]\s*/, '');
                repaired.push(`## ${entry.heading}`);
                if (rest) repaired.push(rest);
                matched = true;
                break;
            }
        }
        if (matched) continue;

        repaired.push(line);
    }

    return repaired.join('\n');
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function insertSectionBreaks(text: string) {
    const headingPattern = buildInlinePattern(INLINE_HEADING_TERMS);
    const subheadingPattern = buildInlinePattern(SUBHEADINGS);

    let updated = text;
    if (headingPattern) {
        updated = updated.replace(headingPattern, '$1\n\n$2');
    }
    if (subheadingPattern) {
        updated = updated.replace(subheadingPattern, '$1\n\n$2');
    }
    return updated;
}

function buildInlinePattern(phrases: string[]) {
    if (!phrases.length) return null;
    const escaped = phrases
        .map(value => value.trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!escaped.length) return null;
    // Only split before a heading term when it follows a sentence-ending
    // punctuation mark. This avoids breaking mid-sentence occurrences like
    // "for routine follow-ups" or "check the FAQ section".
    return new RegExp(`([.!?:])\\s+(${escaped.join('|')})\\b`, 'gi');
}
