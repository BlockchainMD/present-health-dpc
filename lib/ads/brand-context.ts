/**
 * PRESENT HEALTH BRAND CONTEXT
 * 
 * Rich context to inject into AI prompts for higher-quality ad generation.
 * This ensures all generated copy is consistent with brand positioning.
 */

export const BRAND_CONTEXT = `
## ABOUT PRESENT HEALTH
Present Health is a Virtual Direct Primary Care (DPC) practice founded by Dr. J, a board-certified family medicine physician with 10+ years of experience. We believe healthcare should be about relationships, not transactions.

## THE DPC MODEL EXPLAINED
Direct Primary Care removes the insurance middleman. Patients pay a flat monthly membership fee directly to their physician, eliminating copays, surprise bills, and insurance paperwork. This allows doctors to maintain smaller panels (max 300 patients vs. 2,500+ in traditional practices) and spend real time with each patient.

## UNIQUE DIFFERENTIATORS
1. **Relationship-First Model**: Unlike concierge practices focused on luxury perks, we focus on genuine doctor-patient relationships and unhurried care.
2. **Virtual-Native**: Built for telehealth from day one—text, video, or phone. No physical overhead means savings passed to members.
3. **HSA-Friendly (2026)**: Priced at $149/mo—specifically within IRS HSA limits ($150/mo individual) so members can pay with pre-tax dollars.
4. **Anti-Rushed Care**: Minimum 30-minute visits. Your doctor actually has time to listen.
5. **Direct Access**: Text or email your doctor directly—no phone trees, no waiting for callbacks.

## WHAT WE ARE NOT (COMPLIANCE CRITICAL)
- NOT insurance (we complement high-deductible health plans, not replace them)
- NOT urgent care/ER replacement (call 911 for emergencies)
- NOT a prescription service (we coordinate care, we don't just dispense medications)
- NOT 24/7 (direct access during practice hours, with clear expectations)
- NOT making medical claims in ads (no "cure", "guarantee", "100%")

## IDEAL PATIENT PROFILE
- Adults (25-55) frustrated with the traditional healthcare system
- Remote workers or digital nomads without easy access to local clinics
- People with high-deductible health plans looking to maximize value
- Health-conscious individuals wanting a proactive partner, not reactive sick visits
- Busy professionals who value their time and hate waiting rooms
- Parents seeking a trusted advisor for family health decisions

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
- Board-certified family medicine physician
- 10+ years of clinical experience
- Limited patient panel for personalized attention
- No insurance billing = no surprise costs
- Transparent, flat-rate pricing
- Cancel anytime, no contracts

## PRICING (CURRENT)
- Individual: $149/month ($1,639/year if paid annually—save 1 month)
- HSA/FSA eligible starting January 2026 (subject to IRS rules)
- Labs and prescriptions billed separately at transparent cost

## CALL TO ACTION PREFERENCES
- Primary CTA: "Book a Free Intro Call" (low commitment, high conversion)
- Secondary: "See Pricing" or "Learn More"
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
