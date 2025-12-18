
export interface ComplianceResult {
    status: 'PASS' | 'FAIL';
    reasons: string[];
}

// STRICT DENYLIST: These terms must NEVER appear in ads, keywords, or landing pages.
// Case-insensitive matching will be applied.
const DENYLIST = [
    // Prescriptions & Meds
    "prescription", "rx", "refill", "pharmacy", "medication", "medicine", "drug", "pill", "tablet", "capsule",
    "controlled substance", "narcotic", "opioid", "stimulant", "adderall", "ritalin", "vyvanse", "concerta",
    "xanax", "valium", "klonopin", "ativan", "ambien", "lunesta", "oxycodone", "hydrocodone", "percocet",
    "vicodin", "morphine", "codeine", "fentanyl", "tramadol", "suboxone", "methadone",
    "ozempic", "wegovy", "mounjaro", "zepbound", "saxenda", "victoza", "rybelsus", "trulicity", "bydureon",
    "viagra", "cialis", "levitra", "sildenafil", "tadalafil", "finasteride", "propecia", "minoxidil", "rogaine",
    "accutane", "isotretinoin", "retin-a", "tretinoin", "antibiotic", "amoxicillin", "z-pak", "azithromycin",

    // Telehealth "Pill Mill" Signals
    "get meds", "buy meds", "order meds", "online script", "online prescription", "same day script",
    "instant script", "no insurance needed", "cheap meds", "discount meds",

    // Misleading Claims
    "cure", "guarantee", "miracle", "magic", "secret", "fix", "reverse",

    // Insurance Terms (to avoid confusion/compliance issues if we are cash-pay only)
    // "insurance accepted" - we are DPC, we don't bill insurance.
    // Insurance Terms (to avoid confusion/compliance issues if we are cash-pay only)
    // "insurance accepted" - we are DPC, we don't bill insurance.
    "medicare", "medicaid", "tricare", "insurance accepted", "bill insurance", "copay", "deductible",

    // Unsubstantiated Claims / Specific Stats (unless verified)
    "24/7", "24/7 access", "open 24 hours",
    "95%", "90%", "99%", "100%", // Ban specific high percentages commonly hallucinated
    "10,000", "5,000", "1,000", "million" // Ban specific large user counts
];

// REQUIRED TERMS: Landing pages MUST contain these (or variations).
const REQUIRED_DISCLAIMERS = [
    "not insurance",
    "membership",
    "direct primary care"
];

export function validateContent(content: string, context: string = "General"): ComplianceResult {
    const reasons: string[] = [];
    const lowerContent = content.toLowerCase();

    // 1. Check Denylist
    for (const term of DENYLIST) {
        if (term === "bill insurance") {
            // Context-aware check for "bill insurance"
            // We want to BAN "bill insurance" UNLESS it is preceded by a negation like "not", "no", "don't"
            // Regex matches: (not|no|don't|do not|doesn't) [optional words] bill insurance
            // But checking for presence of banned phrase WITHOUT negation is easier:

            // Find all occurrences of "bill insurance"
            const indices = [];
            let pos = lowerContent.indexOf(term);
            while (pos !== -1) {
                indices.push(pos);
                pos = lowerContent.indexOf(term, pos + 1);
            }

            for (const index of indices) {
                // Look at the preceding characters (e.g., 20 chars back)
                const precedingText = lowerContent.substring(Math.max(0, index - 25), index);
                // If it DOES NOT contain a negation, flag it.
                if (!/(not|no|don't|won't|never)\b/.test(precedingText)) {
                    reasons.push(`[${context}] Contains forbidden term: "${term}" (context suggesting you might bill insurance)`);
                }
            }
        } else {
            // Standard check for other terms
            if (lowerContent.includes(term)) {
                reasons.push(`[${context}] Contains forbidden term: "${term}"`);
            }
        }
    }

    // 2. Check Required Disclaimers (Only for Landing Pages)
    if (context === "Landing Page") {
        const hasDisclaimer = REQUIRED_DISCLAIMERS.some(term => lowerContent.includes(term));
        if (!hasDisclaimer) {
            reasons.push(`[${context}] Missing required DPC disclaimer (must mention "not insurance" or "membership").`);
        }
    }

    return {
        status: reasons.length > 0 ? 'FAIL' : 'PASS',
        reasons
    };
}

export function validateCampaignSpec(spec: any): ComplianceResult {
    const reasons: string[] = [];

    // Validate Seed Keywords
    if (spec.seedKeywords) {
        spec.seedKeywords.forEach((kw: string) => {
            const res = validateContent(kw, "Keyword");
            if (res.status === 'FAIL') reasons.push(...res.reasons);
        });
    }

    // Validate Intent/Persona
    if (spec.intent) {
        const res = validateContent(spec.intent, "Intent");
        if (res.status === 'FAIL') reasons.push(...res.reasons);
    }

    return {
        status: reasons.length > 0 ? 'FAIL' : 'PASS',
        reasons
    };
}
