export function normalizeMarkdownForRender(markdown: string) {
    if (!markdown) return markdown;
    let text = markdown.replace(/\r\n/g, '\n');
    text = text.replace(/^\s*Hook:\s*/gim, '');
    text = text.replace(/^##\s+What matters more than the headline\b/gim, '## Key context');
    text = text.replace(/^##\s+How the practice can help\b/gim, '## How Present Health can help');
    text = text.replace(/([^\n])\s*(#{2,6}\s+)/g, '$1\n\n$2');
    text = text.replace(/(#{2,6} [^\n]+)\s*(?=[^\n])/g, '$1\n\n');
    text = text.replace(/(##\s+TL;DR)\s+-\s+/gi, '$1\n- ');
    text = text.replace(/(##[^\n]+)\s+-\s+/g, '$1\n- ');
    text = addSectionIntro(text, 'Key context', 'Key context helps clarify what matters beyond the headline.');
    text = addSectionIntro(text, 'Special situations', 'These situations can change the plan or the level of urgency.');
    text = addSectionIntro(text, 'Practical plan', 'Use this plan to take small, repeatable steps this week.');
    text = addSectionIntro(text, 'How Present Health can help', 'Here is how a direct primary care team can support you:');
    text = text.replace(/^\s*[-*]\s*$/gm, '');
    text = dedupeAdjacentLines(text);
    text = dedupeAdjacentParagraphs(text);
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
}

function addSectionIntro(markdown: string, heading: string, intro: string) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(##\\s+${escaped}\\s*)([\\s\\S]*?)(?=\\n##\\s|$)`, 'gi');
    return markdown.replace(regex, (_, h, body) => {
        const lowerBody = body.toLowerCase();
        if (lowerBody.includes(intro.toLowerCase())) {
            return `${h.trim()}\n\n${body.trim()}\n`;
        }
        const lines = body.split('\n').map((line: string) => line.trim()).filter(Boolean);
        const hasParagraph = lines.some((line: string) => !line.startsWith('-') && !line.startsWith('*') && !line.startsWith('###'));
        if (hasParagraph || lines.length === 0) {
            return `${h.trim()}\n\n${body.trim()}\n`;
        }
        return `${h.trim()}\n\n${intro}\n\n${body.trim()}\n`;
    });
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
