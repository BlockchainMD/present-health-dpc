import { validateContent } from './compliance';

const INTENT_MODIFIERS = [
    "membership",
    "direct primary care",
    "doctor",
    "physician",
    "clinic",
    "near me",
    "appointment",
    "care",
    "telehealth",
    "virtual doctor"
];

export function generateKeywords(seedKeywords: string[]): { keyword: string, matchType: 'PHRASE' | 'EXACT' }[] {
    const keywords: Set<string> = new Set();

    // 1. Add Seeds directly
    seedKeywords
        .filter(k => typeof k === 'string' && k.trim().length > 0)
        .forEach(k => keywords.add(k.toLowerCase().trim()));

    // 2. Generate Combinations
    seedKeywords
        .filter(seed => typeof seed === 'string' && seed.trim().length > 0)
        .forEach(seed => {
        const cleanSeed = seed.toLowerCase().trim();
        INTENT_MODIFIERS.forEach(mod => {
            keywords.add(`${cleanSeed} ${mod}`);
            keywords.add(`${mod} ${cleanSeed}`);
        });
    });

    // 3. Convert to Objects & Validate
    const results: { keyword: string, matchType: 'PHRASE' | 'EXACT' }[] = [];

    keywords.forEach(kw => {
        // Validate
        const compliance = validateContent(kw, "Generated Keyword");
        if (compliance.status === 'PASS') {
            // Add Phrase Match
            results.push({ keyword: kw, matchType: 'PHRASE' });
            // Add Exact Match
            results.push({ keyword: kw, matchType: 'EXACT' });
        }
    });

    return results;
}
