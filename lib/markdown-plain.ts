export function markdownToPlainText(markdown: string): string {
    if (!markdown) return "";
    let text = String(markdown);

    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, " ");
    // Images: ![alt](url) -> alt
    text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
    // Links: [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    // Headings and list markers
    text = text.replace(/^\s{0,3}#{1,6}\s+/gm, "");
    text = text.replace(/^\s*[-*+]\s+/gm, "");
    text = text.replace(/^\s*\d+\.\s+/gm, "");
    text = text.replace(/^\s*>\s?/gm, "");
    // Inline code
    text = text.replace(/`([^`]+)`/g, "$1");
    // Emphasis markers
    text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
    text = text.replace(/(\*|_)(.*?)\1/g, "$2");

    text = text.replace(/\s+/g, " ").trim();
    return text;
}

