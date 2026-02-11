export function lintMarkdown(content: string): string[] {
    const issues: string[] = [];
    if (!content) return issues;
    const scrubbed = content
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`[^`]*`/g, '');

    const lines = scrubbed.split('\n');
    const hasInlineHeading = lines.some(line => /##\s/.test(line) && !/^\s*#{2,6}\s/.test(line));
    if (hasInlineHeading) {
        issues.push('Heading token appears mid-line (possible newline collapse).');
    }

    if (/[a-z0-9][^\n]{0,80}##\s/i.test(scrubbed)) {
        issues.push('Heading token appears mid-sentence.');
    }

    if (/TL;DR[ \t]*-[ \t]/i.test(scrubbed)) {
        issues.push('TL;DR bullets appear inline (missing line breaks).');
    }

    const tldrMatch = scrubbed.match(/##\s+TL;DR([\s\S]*?)(?=##\s|$)/i);
    if (tldrMatch) {
        const body = tldrMatch[1];
        if (!/\n\s*[-*]\s+/.test(body)) {
            issues.push('TL;DR section is missing bullet list formatting.');
        }
    }

    return Array.from(new Set(issues));
}
