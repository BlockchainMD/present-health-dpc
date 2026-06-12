# SPEC-002 — Rework /book into a membership-first flow

## Objective
`/book` currently runs a legacy per-visit flow that asks insurance questions up front (a relic of the reverted March "insurance-first" rebrand). Rework it so the primary path is membership signup, while preserving a secondary single-visit request path. Launch is imminent: this page receives "Book" intent traffic and must not leak it.

## Context (read first)
- `app/(main)/book/page.tsx` — current multi-step client form (step "insurance" first).
- `app/(main)/join/page.tsx` — restored membership funnel (individual/household, monthly/annual → `/register?plan=...&billing=...`); `app/(main)/visit/page.tsx` + `components/visit/SingleVisitRequestForm.tsx` — single-visit request path.
- Guards that MUST stay green: `tests/business-model-truth-guards.test.js` (+ shared `tests/business-model-truth-patterns.js`), `tests/visit-page-guards.test.js`, `tests/membership-billing-guards.test.js`, `tests/page-layout-guards.test.js`, `tests/checkout-first-guards.test.js`.
- Analytics: `lib/analytics.ts` (`trackEvent`, AnalyticsEvents.JOIN_CLICK etc.) — instrument the choice points.

## Requirements
1. `/book` becomes a lightweight chooser page (server component where possible): headline "How do you want to start?", two cards — **Membership** ($99/mo individual · $179/mo household · HSA-eligible · primary, visually emphasized, links to `/join` preserving query params) and **Single visit** (links to `/visit`). No insurance questions on this page.
2. Move any still-useful pieces of the old form (state-of-residence validation against `lib/us-states.ts`, contact capture) into the single-visit path ONLY if `SingleVisitRequestForm` lacks them — inspect first; do not duplicate.
3. Keep collecting optional insurance info ONLY where it already legitimately exists downstream (lab/pharmacy routing context), never as a gate, never implying we bill insurance.
4. Fire `trackEvent` JOIN_CLICK (membership card) and a new `VISIT_PATH_CLICK` event (add to AnalyticsEvents + GA4 map as `select_content` or similar existing convention) on the two choices.
5. Update any internal links/copy that referenced the old multi-step booking ("Book a Visit") to fit the chooser semantics — search app/ and components/ for `/book` references and reconcile labels (e.g., "Get started").
6. Add/extend a guard test: `/book` contains both `/join` and `/visit` links, no insurance-gate step, and passes FORBIDDEN patterns.

## Acceptance criteria
- `npm test` fully green (all existing + new), `npx tsc --noEmit` clean, `npm run build` exit 0.
- No route deleted; `/book` URL keeps working (ads/system may reference it).
- Mobile-presentable: two stacked cards on small screens (match existing Tailwind patterns).
- Commit message: `feat(book): membership-first chooser flow (SPEC-002)`.

## Out of scope
Pricing, copy tone beyond what's specified, Stripe logic, the /join and /visit internals (beyond §2), design-system changes.
