# Present Health MD 2026 Strategy

Date: May 15, 2026

## Executive Thesis

The highest-leverage version of Present Health MD is not another low-price urgent telehealth site and not an insurance-billed virtual clinic on day one.

Build an AI-native, physician-led, relationship-based direct primary care service for adults in your licensed states, focused on cardiometabolic health, medication/lab continuity, and high-friction primary care navigation. Sell it first as a direct membership and employer PEPM benefit, with single visits only as an acquisition/triage path. Keep insurance billing as a later optional capability, not the initial business model.

This preserves the advantage you actually have:

- You are a board-certified family physician with multi-state licensure.
- You have telehealth and medical director experience.
- You can build, automate, and iterate without a large engineering team.
- You can credibly offer continuity, judgment, and operational trust in a market full of commodity visit vendors.

The brand should be Present Health MD. The model can use DPC-compatible mechanics without leading with the old DPC identity. In public copy, call it "direct primary care membership" or "direct virtual primary care" and be clear that it is not insurance.

## Market Reality

Commodity virtual urgent care is already owned by scale players:

- Amazon One Medical offers pay-per-visit telehealth for 30+ common conditions at $29 for message visits and $49 for video visits, plus Prime-discounted One Medical membership.
- One Medical sells a $199/year membership while billing insurance for scheduled visits.
- PlushCare advertises $19.99/month membership plus insurance copay or $129 self-pay visits.
- Circle Medical offers no-membership primary care, many PPO plans, and self-pay visits around $149-$179 first visit and $120 follow-up.
- Sesame is a cash-pay marketplace with upfront prices as low as the mid-$30s and explicitly does not bill insurance.
- Galileo and Firefly compete more in employer/health plan virtual primary care, claiming longitudinal care and cost reduction.

Present Health cannot win by being "cheaper Amazon" or "smaller One Medical." The winning wedge is:

Physician continuity + multi-state access + chronic/metabolic primary care + direct messaging + fast clinical judgment + pragmatic coordination.

## Policy And Economic Tailwinds

1. HSA/DPC tailwind: Beginning January 1, 2026, qualifying direct primary care service arrangements no longer disqualify otherwise eligible people from HSA contributions, and HSA funds can pay periodic DPC fees. The 2026 monthly fee ceiling is $150 for one individual and $300 for arrangements covering more than one individual.

2. Telehealth acceptance: Medicare telehealth flexibilities have been extended through December 31, 2027 for many services, including home as originating site and no geographic restrictions for non-behavioral/mental telehealth.

3. Controlled substance bridge, not foundation: DEA/HHS extended telemedicine controlled-substance prescribing flexibilities through December 31, 2026, but this remains temporary and should not be a core growth dependency.

4. Employer pain: KFF reported 2025 family employer premiums near $27,000, and Mercer projected a 6.5% employer health benefit cost increase in 2026, the highest since 2010. Employers are looking for credible, low-bureaucracy primary care and chronic disease support.

5. Physician shortage: AAMC projects ongoing physician shortages through 2036, with access pressure especially visible in primary care. A multi-state virtual practice can turn licensure and software into access leverage.

## Policy And Market Headwinds

1. State licensure remains patient-location based. Telemedicine care must respect the state where the patient is located at the time of care.

2. Insurance billing is operationally heavy: credentialing, payer contracting, claims, denials, RCM, prior auth, audits, and delayed cash. It also makes the business less nimble.

3. GLP-1s are high-demand but politically, legally, and commercially volatile. FDA has flagged concerns around unapproved compounded GLP-1 products, and major retailers/telehealth brands are crowding the space.

4. AI in clinical workflows is a trust and compliance opportunity, but not a marketing gimmick. Use AI for intake, summarization, education drafts, triage support, and internal QA with physician accountability.

5. Public clinical claims and PHI collection need tightening before launch. Current code has both direct-care membership language and insurance-accepted language.

## Recommended Payment Model

### Primary Model: Direct Membership

Offer adult virtual primary care membership:

- Individual: $99/month
- Annual: $990/year
- Two-adult household: $179/month
- Family/children: defer until pediatric workflows, consent, and coverage are ready

Keep the individual price below the 2026 $150 DPC/HSA ceiling. Keep multi-person arrangements below $300. Do not include services that would break DPCSA eligibility without tax/compliance review.

Membership includes:

- Secure asynchronous messaging
- Video visits when clinically appropriate
- Medication refills and medication optimization
- Lab ordering and interpretation
- Chronic disease follow-up for hypertension, diabetes/prediabetes, obesity, lipids, thyroid, asthma, migraine, and common primary care needs
- Care navigation and referrals
- Preventive planning and screening reminders

Membership excludes:

- Emergency care
- Hospital care
- Procedures requiring in-person care
- Specialist care
- Prescription drug cost, except vaccines if intentionally included and compliant
- Lab costs unless separately arranged and compliant

### Secondary Model: Single Visit

Use single visits as a front door, not the core business.

Recommended price: $79-$99, not $29.

The current $29 self-pay positioning competes directly with Amazon and attracts low-continuity urgent care demand. A physician-led single visit should be priced as a qualified doctor visit and used to convert appropriate patients into membership.

Offer:

- "One-time virtual doctor visit: $99"
- Credit $50 toward first month if they become a member within 7 days

### Best Growth Model: Employer PEPM

Target small and mid-size employers in licensed states, especially groups with HDHP/HSA pain and no strong primary care access.

Offer:

- Access-only employer plan: $12-$19 PEPM, low utilization assumptions, triage and navigation
- Direct care employer plan: $29 PEPM, includes membership-level primary care access for eligible employees
- Setup fee: $750-$2,500 depending on group size
- Minimum: 10 enrolled employees or $500/month floor
- Contract: 12 months

Employer pitch:

"Your employees already have insurance. They still cannot get fast, relationship-based primary care. Present Health MD gives them direct physician-led access, chronic condition support, and care navigation for less than the cost of one avoidable urgent care visit per employee per year."

### High-Cashflow Bridge: Advisory / Medical Director Work

If conflict-of-interest review allows it, create a separate advisory offer:

- Fractional telehealth medical director
- Clinical protocol review
- AI clinical safety review
- Telehealth operations and state-practice compliance support
- Pricing: $5,000-$15,000/month retainer

This can fund the patient business without forcing premature patient-volume growth. Keep it separate from patient care branding if needed.

### Later Model: Insurance

Do not lead with insurance billing. Revisit after:

- 100+ paying members
- 3+ employer pilots
- Clean HIPAA/compliance stack
- Clear in-state payer opportunity
- RCM partner identified

If added, insurance should support specific markets and services, not define the business.

## Product Positioning

The best positioning:

"A real family physician in your pocket for the primary care problems that keep falling through the cracks."

Core audience:

- Adults 30-65
- High-deductible, self-employed, contractor, small business, or under-served by existing PCP
- Multiple chronic or semi-chronic needs
- Wants relationship and medication/lab continuity, not a random urgent care queue

Initial clinical wedge:

- Blood pressure
- Prediabetes/type 2 diabetes
- Weight and GLP-1 navigation
- Lipids/cardiovascular risk
- Thyroid
- Medication refills and cleanup
- Primary care navigation

Do not brand as a GLP-1 clinic. Offer medically responsible weight management as one part of broader cardiometabolic primary care.

## Codebase Findings

Existing assets:

- Public marketing pages: home, conditions, pricing, states, physician, employer, learn/blog.
- Lead capture: waitlist, visit requests, register, employer inquiries, unified leads.
- Admin tooling: leads, employers, content ops, SEO health, reviews, PR, campaigns, trust hub.
- Content engine and SEO infrastructure.
- Stripe, auth, Prisma, email, analytics, attribution, GA4, ad tooling.
- Served-state list for 15 states.

Strategic conflicts to fix:

- `app/(main)/page.tsx` and `app/(main)/pricing/page.tsx` say insurance accepted and $29 self-pay.
- `lib/pricing.ts`, `components/pricing/MembershipTiers.tsx`, `lib/ads/brand-context.ts`, `lib/schema.ts`, and tests still encode $99/month direct membership/DPC.
- `lib/trust-hub.ts`, `lib/pr.ts`, and ad tooling still contain DPC language.
- `/book` currently functions as a client-side confirmation flow and does not submit to `app/api/visit-requests/route.ts`.
- The current site collects sensitive fields in some flows. Do not connect clinical intake to the homegrown app until HIPAA infrastructure, BAAs, consent, retention, access controls, and clinical record workflows are locked.

## Immediate Product Decision

Choose the direct membership model now.

Reason:

- HSA/DPC policy has become more favorable in 2026.
- It avoids premature insurance operations.
- It creates recurring revenue.
- It fits a solo physician better than high-volume episodic care.
- It gives employer buyers a clean, understandable benefit.
- It gives the codebase a coherent story.

The insurance-accepted model can come later, but it should not be the brand promise until payer contracting and billing operations are real.

## Execution Roadmap

### Phase 0: While COI Review Is Pending

Do not publicly launch patient operations.

Do:

- Keep local and GitHub source of truth clean.
- Restore hosting only as staging or private preview.
- Write legal/compliance checklist.
- Choose EHR/clinical record system.
- Define clinical scope, state-specific SOPs, emergency escalation, and in-person referral rules.
- Remove or gate any public copy that implies active clinical availability if that creates COI risk.

### Phase 1: Strategy Alignment Sprint

Files to align:

- `app/(main)/page.tsx`
- `app/layout.tsx`
- `app/(main)/pricing/page.tsx`
- `components/pricing/MembershipTiers.tsx`
- `lib/pricing.ts`
- `lib/schema.ts`
- `lib/trust-hub.ts`
- `lib/ads/brand-context.ts`
- `lib/ads/compliance.ts`
- tests covering pricing and copy

Decisions:

- Replace "we accept insurance" with "direct virtual primary care membership."
- Replace "$29 visit" with "$99 one-time visit" or "fit call / join waitlist" during prelaunch.
- Preserve `presenthealthmd.com` brand and domain.
- Keep cloud resource names as historical for now.

### Phase 2: Clinical Infrastructure

Before collecting patient medical details:

- Execute BAA-covered hosting/EHR/vendor stack.
- Decide whether the clinical chart lives in a dedicated EHR rather than Prisma.
- Add informed consent for telehealth.
- Add state/location attestation at every visit.
- Add emergency/escalation language.
- Add prescribing policy, including controlled substances and GLP-1 policy.
- Add patient identity verification.
- Add lab workflow and external record workflow.

### Phase 3: Beta Launch

Target:

- 25 beta members
- 5 single-visit conversions
- 2 employer discovery calls per week
- 1 small employer pilot

Acquisition:

- Personal founder story
- LinkedIn and local professional network
- State landing pages
- Employer outreach from existing CRM tooling
- Reviews/testimonials only from appropriate non-PHI, compliant workflows
- SEO around "virtual primary care in [state]", "online doctor for blood pressure", "GLP-1 primary care monitoring", "direct primary care HSA 2026"

### Phase 4: Employer Pilot

Offer a narrow pilot:

- 90 days
- 25-100 eligible employees
- $19-$29 PEPM
- Includes intake, direct message access, medication/lab navigation, and monthly aggregate non-PHI report
- Success metrics: activation, response time, resolved issues, avoided urgent care estimate, patient satisfaction

### Phase 5: Scale With Constraints

Do not scale beyond clinical capacity.

Capacity assumptions:

- Solo panel: 150-300 members depending on utilization and scope.
- Add contractor physician/APP only after protocols, QA, and member experience are stable.
- Keep physician-led identity by making you the clinical architect, not the bottleneck for every low-acuity message.

## 12-Month Targets

Conservative target:

- 100 members at $99/month = $9,900 MRR
- 2 employer pilots totaling 100 lives at $19 PEPM = $1,900 MRR
- 1 advisory client at $5,000/month = $5,000 MRR
- Total: about $16,800 MRR

Strong target:

- 250 members at $99/month = $24,750 MRR
- 5 employer clients totaling 500 lives at $19 PEPM = $9,500 MRR
- 2 advisory clients at $7,500/month = $15,000 MRR
- Total: about $49,250 MRR

Long-term leverage target:

- Patient care business proves the model.
- Employer pilots produce data.
- Software workflows become proprietary operating infrastructure.
- Advisory work becomes productized into templates, protocols, and eventually software.

## What Not To Do

- Do not compete with Amazon on $29 urgent care.
- Do not launch "insurance accepted" unless credentialing and billing are operationally true.
- Do not build around controlled substances.
- Do not become a GLP-1 compounding storefront.
- Do not collect full clinical intake into a non-finalized HIPAA stack.
- Do not pursue all 15 states equally at first. Pick 3-5 highest-probability states for launch focus.

## Best Next Actions

1. Decide that Present Health MD is direct membership first, not insurance billing first.
2. Convert the site copy and schema to a coherent membership model.
3. Turn `/book` into either a prelaunch interest form or a real visit request that posts to the API.
4. Remove `$29` from primary pricing.
5. Build a HIPAA/clinical operations checklist before patient data capture.
6. Prepare a 25-member beta.
7. Build the employer pilot page and CRM workflow around PEPM access.
8. Keep advisory/medical director work as the cashflow bridge if COI permits.

## Sources

- HHS/DEA controlled-substance telemedicine extension through 2026: https://www.hhs.gov/press-room/dea-telemedicine-extension-2026.html
- HHS Medicare telehealth flexibilities through 2027: https://telehealth.hhs.gov/providers/billing-and-reimbursement/medicare-payment-policies
- CMS telehealth services page: https://www.cms.gov/medicare/coverage/telehealth
- FSMB telemedicine licensure and standard-of-care guidance: https://www.fsmb.org/siteassets/advocacy/policies/fsmb-workgroup-on-telemedicineapril-2022-final.pdf
- IRS Notice 2026-05 / DPC and HSA guidance: https://www.irs.gov/irb/2026-02_IRB
- IRS OBBB HSA guidance news release: https://www.irs.gov/newsroom/treasury-irs-provide-guidance-on-new-tax-benefits-for-health-savings-account-participants-under-the-one-big-beautiful-bill
- KFF 2025 Employer Health Benefits Survey: https://www.kff.org/health-costs/2025-employer-health-benefits-survey/
- Mercer 2026 employer health cost projection: https://www.mercer.com/en-us/about/newsroom/employers-are-bracing-for-the-highest-health-benefit-cost-increase-in-15-years/
- Business Group on Health 2026 trends: https://www.businessgrouphealth.org/newsroom/news-and-press-releases/press-releases/2026-trends-to-watch
- AAMC physician shortage projection: https://www.aamc.org/news/press-releases/new-aamc-report-shows-continuing-projected-physician-shortage
- Amazon One Medical pay-per-visit pricing: https://www.aboutamazon.com/news/retail/amazon-one-medical-pharmacy-prescriptions-common-conditions
- Amazon Health AI / One Medical pricing: https://www.aboutamazon.com/news/retail/amazon-health-ai-agent-one-medical/
- One Medical membership: https://www.onemedical.com/membership/
- Circle Medical pricing and insurance: https://www.circlemedical.com/
- Galileo virtual primary care / employer positioning: https://galileo.io/
- PlushCare primary care pricing: https://plushcare.com/primary-care
- Sesame telehealth marketplace: https://sesamecare.com/service/telehealth-visit
