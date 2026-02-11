import { Brief } from './types';

type NormalizeOptions = {
    title: string;
    actionSteps?: string[];
    primaryQuestion?: string;
};

export function normalizeMarkdown(content: string, options: NormalizeOptions) {
    let text = content.replace(/\r\n/g, '\n');
    text = text.replace(/^\s*Hook:\s*/gim, '');

    text = stripLeadingH1(text);
    text = text.replace(/^##\s+What matters more than the headline\b/gim, '## Key context');
    text = text.replace(/^##\s+How the practice can help\b/gim, '## How Present Health can help');

    // Ensure headings are on their own lines and separated by blank lines.
    text = text.replace(/([^\n])\s*(#{2,6}\s+)/g, '$1\n\n$2');
    text = text.replace(/(#{2,6} [^\n]+)\n(?!\n)/g, '$1\n\n');
    text = text.replace(/^(##\s+FAQ)(\s+.+)$/gim, '$1\n\n$2');

    text = formatSection(text, 'TL;DR', (body) => {
        return bulletizeTldr(body, options.actionSteps || []);
    });
    text = formatSection(text, 'Key context', (body) => {
        return ensureSectionIntro(body, 'Key context helps clarify what matters beyond the headline.');
    });
    text = formatSection(text, 'Special situations', (body) => {
        return ensureSectionIntro(body, 'These situations can change the plan or the level of urgency.');
    });
    text = formatSection(text, 'Action steps this week', (body) => {
        return bulletizePlan(body, options.actionSteps || []);
    });
    text = formatSection(text, 'Practical plan', (body) => {
        const plan = bulletizePlan(body, options.actionSteps || []);
        return ensureSectionIntro(plan, 'Use this plan to take small, repeatable steps this week.');
    });
    text = formatSection(text, 'When to seek care', (body) => {
        return bulletizeWhenToSeek(body);
    });
    text = formatSection(text, 'How Present Health can help', (body) => {
        const help = bulletizeHelp(body);
        return ensureSectionIntro(help, 'Here is how a direct primary care team can support you:');
    });
    text = formatSection(text, 'FAQ', (body) => {
        return formatFaq(body, options.primaryQuestion || options.title);
    });

    text = removeEmptyBullets(text);
    text = dedupeAdjacentLines(text);
    text = dedupeAdjacentParagraphs(text);

    return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function normalizeMarkdownFromBrief(content: string, brief: Brief) {
    return normalizeMarkdown(content, {
        title: brief.title,
        actionSteps: brief.actionSteps,
        primaryQuestion: brief.primaryQuestion
    });
}

function formatSection(content: string, heading: string, formatter: (body: string) => string): string {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(##\\s+${escaped}\\s*)([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    return content.replace(regex, (_, h, body) => {
        const formatted = formatter(body.trim());
        return `${h.trim()}\n\n${formatted}\n`;
    });
}

function bulletizeTldr(body: string, fallback: string[]): string {
    const lines = body.split('\n').map(line => line.trim()).filter(Boolean);
    const hasBullets = lines.some(line => /^[-*]\s+/.test(line));
    if (hasBullets) {
        const normalized: string[] = [];
        for (const line of lines) {
            const stripped = line.replace(/^[-*]\s+/, '').trim();
            const parts = stripped.split(/\s+-\s+/).filter(Boolean);
            if (parts.length > 1) {
                normalized.push(...parts);
            } else if (stripped) {
                normalized.push(stripped);
            }
        }
        return normalized.slice(0, 5).map(item => `- ${item}`).join('\n');
    }

    const compact = body.replace(/\s+/g, ' ').trim();
    const inlineBullets = splitInlineBullets(compact);
    if (inlineBullets.length > 1) {
        return inlineBullets.slice(0, 5).map(item => `- ${item}`).join('\n');
    }
    const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean);
    let bullets = sentences;
    if (bullets.length < 3 && fallback.length > 0) {
        bullets = bullets.concat(fallback.slice(0, 3 - bullets.length));
    }
    return bullets.slice(0, 5).map(sentence => `- ${sentence.replace(/\.$/, '')}`).join('\n') || '- Start with one small change this week.';
}

function bulletizeWhenToSeek(body: string): string {
    if (/###\s+urgent now/i.test(body)) {
        return body.trim();
    }
    const lines = body.split('\n').map(line => line.trim()).filter(Boolean);
    const hasBullets = lines.some(line => /^[-*]\s+/.test(line));
    if (hasBullets) {
        return lines.map(line => `- ${line.replace(/^[-*]\s+/, '')}`).join('\n');
    }

    const compact = body.replace(/\s+/g, ' ').trim();
    const sentences = compact.split(/(?<=\.)\s+/).map(s => s.trim()).filter(Boolean);
    if (sentences.length > 1) {
        return sentences.map(sentence => `- ${sentence}`).join('\n');
    }

    return `- If symptoms are severe, sudden, or worsening.\n- If symptoms interfere with daily life or sleep.\n- If you feel unsure or the pattern is changing.`;
}

function bulletizePlan(body: string, fallback: string[]): string {
    const lines = body.split('\n').map(line => line.trim()).filter(Boolean);
    const hasBullets = lines.some(line => /^[-*]\s+/.test(line));
    if (hasBullets) {
        return lines.map(line => `- ${line.replace(/^[-*]\s+/, '')}`).join('\n');
    }

    const compact = body.replace(/\s+/g, ' ').trim();
    const inlineBullets = splitInlineBullets(compact);
    if (inlineBullets.length > 1) {
        return inlineBullets.map(item => `- ${item}`).join('\n');
    }
    if (compact) {
        return compact.split(/(?<=[.!?])\s+/).map(sentence => `- ${sentence}`).join('\n');
    }

    if (fallback.length > 0) {
        return fallback.map(step => `- ${step}`).join('\n');
    }

    return '- Start with one small change and track it for a week.';
}

function bulletizeHelp(body: string): string {
    const lines = body.split('\n').map(line => line.trim()).filter(Boolean);
    const hasBullets = lines.some(line => /^[-*]\s+/.test(line));
    if (hasBullets) {
        return lines.map(line => `- ${line.replace(/^[-*]\s+/, '')}`).join('\n');
    }
    const compact = body.replace(/\s+/g, ' ').trim();
    const inlineBullets = splitInlineBullets(compact);
    if (inlineBullets.length > 1) {
        return inlineBullets.map(item => `- ${item}`).join('\n');
    }
    if (!compact) {
        return '- Personalized prevention planning\n- Longer visits for nuanced decisions\n- [Join / See Pricing](/pricing)';
    }
    return compact.split(/(?<=[.!?])\s+/).map(sentence => `- ${sentence}`).join('\n');
}

function formatFaq(body: string, fallbackQuestion: string): string {
    const compact = body.replace(/\s+/g, ' ').trim();
    if (/Q:/.test(compact)) {
        const segments = compact.split(/Q:\s*/i).map(part => part.trim()).filter(Boolean);
        const pairs: Array<{ q: string; a: string }> = [];
        for (const segment of segments) {
            const [questionPart, answerPart] = segment.split(/A:\s*/i);
            if (!questionPart || !answerPart) {
                continue;
            }
            const question = stripAsterisks(questionPart);
            const answer = stripAsterisks(answerPart);
            if (question && answer) {
                pairs.push({ q: question, a: answer });
            }
        }

        if (pairs.length > 0) {
            return pairs.map(pair => `**Q: ${pair.q}**\nA: ${pair.a}`).join('\n\n');
        }
    }

    return `**Q: ${fallbackQuestion}**\nA: Start with one or two practical steps and reassess after a week.`;
}

function stripLeadingH1(text: string): string {
    const trimmed = text.trimStart();
    if (!trimmed.startsWith('# ')) {
        return text;
    }
    return trimmed.replace(/^#\s+[^\n]*\n+/, '');
}

function stripAsterisks(value: string): string {
    return value.replace(/\*+/g, ' ').replace(/\s+/g, ' ').trim();
}

function removeEmptyBullets(text: string): string {
    if (!text) return text;
    const cleaned = text
        .replace(/^\s*[-*]\s*$/gm, '')
        .replace(/\n{3,}/g, '\n\n');
    return cleaned;
}

function ensureSectionIntro(body: string, intro: string): string {
    const lowerBody = body.toLowerCase();
    if (lowerBody.includes(intro.toLowerCase())) {
        return body;
    }
    const lines = body.split('\n').map(line => line.trim());
    const meaningful = lines.filter(line => line.length > 0);
    if (meaningful.length === 0) {
        return intro;
    }
    const hasParagraph = meaningful.some(line => !line.startsWith('-') && !line.startsWith('*') && !line.startsWith('###'));
    if (hasParagraph) {
        return body;
    }
    return `${intro}\n\n${body}`;
}

function splitInlineBullets(text: string): string[] {
    if (!text) return [];
    const dotBullets = text.split(/\s+[•·]\s+/).filter(Boolean);
    if (dotBullets.length > 1) {
        return dotBullets.map(item => item.trim()).filter(Boolean);
    }
    const dashBullets = text.split(/\s+-\s+/).filter(Boolean);
    if (dashBullets.length > 1) {
        return dashBullets.map(item => item.trim()).filter(Boolean);
    }
    return [];
}

function dedupeAdjacentLines(text: string): string {
    const lines = text.split('\n');
    const output: string[] = [];
    let prev = '';
    for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed && trimmed === prev) {
            continue;
        }
        output.push(line);
        prev = trimmed;
    }
    return output.join('\n');
}

function dedupeAdjacentParagraphs(text: string): string {
    const blocks = text.split(/\n{2,}/);
    const output: string[] = [];
    let prev = '';
    for (const block of blocks) {
        const normalized = block.trim().toLowerCase();
        if (normalized && normalized === prev) {
            continue;
        }
        output.push(block);
        prev = normalized;
    }
    return output.join('\n\n');
}
