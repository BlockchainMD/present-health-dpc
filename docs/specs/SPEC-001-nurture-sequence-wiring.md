# SPEC-001 — Wire the founding-member nurture sequence into the auto-response system

## Objective
When a visitor's email is captured (waitlist signup or lead), they receive a 3-email nurture sequence: email 1 immediately, email 2 at day 3, email 3 at day 7. Sequence stops automatically if the person becomes a paying member or unsubscribes.

## Context (read first)
- Next.js App Router repo; relevant existing code: `app/api/waitlist/route.ts`, `app/api/leads/route.ts`, `app/api/auto-response/` (incl. `unsubscribe/route.ts`), `app/api/admin/auto-responses/preview/route.ts`, Prisma schema in `prisma/`.
- An auto-response subsystem already exists — EXTEND it; do not build a parallel one. Inspect how sends/templates/scheduling are modeled before writing code.
- Business model (inviolable, enforced by `tests/business-model-truth-guards.test.js`): flat-fee membership $99/mo individual / $179/mo household; NO insurance billing; no "$29 visit" language anywhere.

## Email content (verbatim; placeholders in brackets)
1. **Immediate — subject: "The three numbers that actually predict heart attacks"** — body: Most physicals check total cholesterol and call it a day. The evidence says three numbers matter more: ApoB (the particle count that drives plaque), blood pressure load, and your coronary calcium score (a ~$120 cash CT scan — in a randomized trial, simply seeing it improved people's risk factors for years). I'm Dr. Rouwhorst, a board-certified family physician. Present Health exists to track those three numbers and manage them down — for a flat $99/month, no insurance games. Reply with any question; I answer personally. — Jonathan Rouwhorst, MD
2. **Day 3 — subject: "The $50/month most heart-health spending wastes"** — body: Cleveland Clinic ran a head-to-head trial: six popular "cholesterol support" supplements vs placebo vs a low-dose statin. The supplements did nothing. The statin dropped LDL ~35%. We practice from that evidence — medications when warranted, lifestyle changes that are measured rather than preached, and re-testing so you see what's working. That's what $99/month buys: medicine, not theater. [CTA button: Start Membership → /join]
3. **Day 7 — subject: "What founding members get"** — body: We're opening with a small founding cohort in Michigan. Founding members get direct messaging with me (not a care-team inbox), a baseline panel ordered in week one, a written risk-reduction plan, and quarterly re-tests on your dashboard. $99/month or $990/year (two months free). HSA-eligible under the 2026 rules. [CTA: Reserve your spot → /join]

## Requirements
1. Persist sequence state per email address (step, scheduled-at, status: active/completed/stopped). Prisma migration if schema lacks it.
2. Scheduling: use the existing pattern in the auto-response subsystem if one exists (cron route, queue, or send-time check). If none, implement a `GET /api/auto-response/cron` route that processes due sends, suitable for Cloud Scheduler, idempotent.
3. Suppression: stop sequence on (a) unsubscribe (existing route), (b) successful membership registration (hook the registration/Stripe-webhook success path), (c) hard bounce if the mailer reports it.
4. Every email includes the existing unsubscribe link mechanism and the footer disclaimer pattern used elsewhere.
5. Admin visibility: extend the existing admin auto-responses page/API minimally so the sequence and per-step counts are visible.
6. Tests: add guard tests in `tests/` following existing style (node:test, source-regex or unit) covering: sequence state transitions, suppression on registration, and that email templates contain no forbidden claims (reuse FORBIDDEN patterns from `tests/business-model-truth-guards.test.js`).

## Acceptance criteria
- `npm test` fully green (existing 67 + new), `npx tsc --noEmit` clean, `npm run build` exits 0.
- No emails actually send in dev/test (mailer mocked or env-gated — follow existing convention; if no mailer exists, implement behind a `MAIL_PROVIDER` env with a no-op default and document the env vars in `.env.example`).
- Idempotent cron: running twice sends nothing twice.
- Commit message: `feat(nurture): founding-member 3-email sequence (SPEC-001)`.

## Out of scope
Sending real mail, choosing/buying an email provider account, marketing copy changes, anything touching pricing or business model.
