/**
 * PRESENT HEALTH BRAND CONTEXT
 * 
 * Rich context to inject into AI prompts for higher-quality ad generation.
 * This ensures all generated copy is consistent with brand positioning.
 */

export const BRAND_CONTEXT = `
## ABOUT PRESENT HEALTH
Present Health is a messaging-first Direct Primary Care (DPC) practice for adults 18+. Care is delivered by licensed clinicians and overseen by a board-certified physician.

## THE DPC MODEL EXPLAINED
Direct Primary Care removes the insurance middleman. Members pay a flat monthly fee directly to the practice, eliminating copays, surprise bills, and insurance paperwork for primary care membership services.

## UNIQUE DIFFERENTIATORS
1. **Messaging-First Access**: Most care starts with secure messaging, with video when clinically appropriate.
2. **One Clear Plan**: $99/month with no tiers, no per-visit fees, and no upsells.
3. **Virtual-Native Care**: Built for telehealth from day one—message, phone, or video.
4. **Transparent Model**: No insurance billing, no copays for membership care, no surprise membership bills.
5. **Clinical Oversight**: Care delivered by licensed clinicians and overseen by a board-certified physician.

## WHAT WE ARE NOT (COMPLIANCE CRITICAL)
- NOT insurance (we complement high-deductible health plans, not replace them)
- NOT urgent care/ER replacement (call 911 for emergencies)
- NOT a prescription service (we coordinate care, we don't just dispense medications)
- NOT 24/7 (direct access during practice hours, with clear expectations)
- NOT making medical claims in ads (no "cure", "guarantee", "100%")

## IDEAL PATIENT PROFILE
- Adults (18+) frustrated with the traditional healthcare system
- Remote workers or digital nomads without easy access to local clinics
- People with high-deductible health plans looking to maximize value
- Health-conscious individuals wanting a proactive partner, not reactive sick visits
- Busy professionals who value their time and hate waiting rooms

## PAIN POINTS WE ADDRESS
1. "I can't get an appointment for 3 weeks"
2. "My doctor doesn't remember who I am"
3. "I spent 20 minutes in the waiting room for a 7-minute visit"
4. "I never know what things will cost until I get the bill"
5. "I call the office and get put on hold forever"
6. "My doctor is always rushing me out the door"

## TONE & VOICE GUIDELINES
- **Empathetic** without being clinical or cold
- **Authoritative** without being arrogant or condescending
- **Premium** without being exclusive or elitist
- **Direct** without being pushy or salesy
- **Human** — we're real people, not a faceless corporation
- Use "you/your" language, not "patients/members"

## KEY PROOF POINTS
- Licensed clinicians with board-certified physician oversight
- Messaging-first care model with clear response-time expectations
- No insurance billing = no surprise costs
- Transparent, flat-rate pricing
- Cancel anytime, no contracts

## PRICING (CURRENT)
- Membership: $99/month ($990/year if paid annually—save $198)
- Single Visit: $99
- Employer plans: $29/employee/month
- HSA/FSA eligible starting January 2026 (subject to IRS rules)
- Labs and prescriptions billed separately at transparent cost

## CALL TO ACTION PREFERENCES
- Primary CTA: "Start Membership — $99/mo"
- Secondary: "See Pricing" or "How It Works"
- AVOID: "Sign Up Now", "Buy Today", "Limited Time" (too aggressive)
`;

export const COMPLIANCE_RULES = `
## STRICT COMPLIANCE RULES FOR AD COPY

### FORBIDDEN TERMS (will trigger ad disapproval)
- "prescription", "Rx", "medication", "pharmacy", "drug"
- "24/7", "24 hours", "around the clock" (use "Direct Access" instead)
- "cure", "heal", "fix", "guarantee", "100%", "promise"
- "best", "top", "#1", "leading" (unsubstantiated superlatives)
- Specific medication names (Ozempic, Wegovy, etc.)
- Specific disease claims without disclaimers

### CHARACTER LIMITS (Google RSA)
- Headlines: Maximum 30 characters each
- Descriptions: Maximum 90 characters each
- Need: 3-15 headlines, 2-4 descriptions

### REQUIRED DISCLAIMERS
- "Not insurance. Membership-based primary care."
- "Does not replace emergency services."
- "Available in select states."
`;

export function getFullPromptContext(): string {
    return BRAND_CONTEXT + "\n\n" + COMPLIANCE_RULES;
}
