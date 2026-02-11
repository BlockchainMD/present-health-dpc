const TEMPLATE_OWNED_SECTIONS = [
    'Education disclaimer',
    'Emergency guidance',
    'Reviewed by'
];

export function stripTemplateOwnedSections(markdown: string, sections = TEMPLATE_OWNED_SECTIONS) {
    let text = markdown;
    if (!text) return text;

    const escaped = sections.map(section => section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    if (!escaped) return text;

    const pattern = new RegExp(`^##\\s+(${escaped})\\b[\\s\\S]*?(?=\\n##\\s|$)`, 'gmi');
    text = text.replace(pattern, '').replace(/\n{3,}/g, '\n\n').trim();

    const paragraphs = text.split(/\n{2,}/);
    const cleaned = paragraphs.filter(paragraph => {
        const trimmed = paragraph.trim().toLowerCase();
        if (!trimmed) return false;
        return !sections.some(section => trimmed.startsWith(section.toLowerCase()));
    });

    return cleaned.join('\n\n').trim();
}

export function hasTemplateOwnedSection(markdown: string, section: string) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^##\\s+${escaped}\\b`, 'mi');
    return pattern.test(markdown);
}

export function getTemplateOwnedSections() {
    return TEMPLATE_OWNED_SECTIONS.slice();
}
