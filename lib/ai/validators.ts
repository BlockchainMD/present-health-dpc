export interface ValidationResult {
    ok: boolean;
    errors: string[];
}

const FORBIDDEN_PHRASES = [
    "guaranteed cure",
    "lowest price",
    "fda approved",
    "miracle drug",
    "free healthcare",
    "100% cure",
    "cheap medicine"
];

const MAX_HEADLINE_LENGTH = 30;
const MAX_DESCRIPTION_LENGTH = 90;

/**
 * Validates Google RSA Headlines
 */
export function validateRsaHeadlines(headlines: string[]): ValidationResult {
    const errors: string[] = [];
    const seen = new Set<string>();

    if (!headlines || headlines.length === 0) {
        errors.push("Headlines list is empty.");
    }

    headlines.forEach((text, index) => {
        const trimmed = text.trim();

        if (!trimmed) {
            errors.push(`Headline ${index + 1} is empty.`);
        }

        if (trimmed.length > MAX_HEADLINE_LENGTH) {
            errors.push(`Headline ${index + 1} exceeds ${MAX_HEADLINE_LENGTH} characters: "${trimmed.substring(0, 20)}..."`);
        }

        const lower = trimmed.toLowerCase();
        FORBIDDEN_PHRASES.forEach(phrase => {
            if (lower.includes(phrase)) {
                errors.push(`Headline ${index + 1} contains forbidden phrase: "${phrase}"`);
            }
        });

        if (seen.has(lower)) {
            errors.push(`Headline ${index + 1} is a duplicate.`);
        }
        seen.add(lower);
    });

    return {
        ok: errors.length === 0,
        errors
    };
}

/**
 * Validates Google RSA Descriptions
 */
export function validateRsaDescriptions(descriptions: string[]): ValidationResult {
    const errors: string[] = [];
    const seen = new Set<string>();

    if (!descriptions || descriptions.length === 0) {
        errors.push("Descriptions list is empty.");
    }

    descriptions.forEach((text, index) => {
        const trimmed = text.trim();

        if (!trimmed) {
            errors.push(`Description ${index + 1} is empty.`);
        }

        if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
            errors.push(`Description ${index + 1} exceeds ${MAX_DESCRIPTION_LENGTH} characters: "${trimmed.substring(0, 20)}..."`);
        }

        const lower = trimmed.toLowerCase();
        FORBIDDEN_PHRASES.forEach(phrase => {
            if (lower.includes(phrase)) {
                errors.push(`Description ${index + 1} contains forbidden phrase: "${phrase}"`);
            }
        });

        if (seen.has(lower)) {
            errors.push(`Description ${index + 1} is a duplicate.`);
        }
        seen.add(lower);
    });

    return {
        ok: errors.length === 0,
        errors
    };
}
