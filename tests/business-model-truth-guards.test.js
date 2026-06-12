const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { FORBIDDEN } = require("./business-model-truth-patterns");

// Guards against business-model drift. In March 2026 an automated rebrand
// rewrote the site into an insurance-billing model the practice cannot
// legally operate (not credentialed with any payer). These tests pin the
// real model: flat-fee cash-pay membership, no insurance billing.
// If a deliberate model change ever happens, update these guards in the
// same commit as the decision — never delete them to silence a failure.

const PAGES = [
    "app/layout.tsx",
    "app/(main)/page.tsx",
    "app/(main)/pricing/page.tsx",
    "app/(main)/how-it-works/page.tsx",
    "app/(main)/about/page.tsx",
    "app/(main)/book/page.tsx",
    "app/(main)/terms/page.tsx",
    "components/layout/Footer.tsx",
];

function read(rel) {
    return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

test("no page claims insurance billing or $29 visits (model-drift guard)", () => {
    for (const rel of PAGES) {
        const source = read(rel);
        for (const pattern of FORBIDDEN) {
            assert.doesNotMatch(
                source,
                pattern,
                `${rel} contains forbidden business-model claim matching ${pattern}`
            );
        }
    }
});

test("membership pricing remains the offer on core pages", () => {
    assert.match(read("app/(main)/pricing/page.tsx"), /\$99\/month/);
    assert.match(read("app/(main)/pricing/page.tsx"), /\$179\/month/);
    assert.match(read("app/(main)/page.tsx"), /\$99\/month/);
    assert.match(read("app/layout.tsx"), /HSA-Eligible/i);
});

test("join page is a membership funnel, not a redirect to per-visit booking", () => {
    const source = read("app/(main)/join/page.tsx");
    assert.doesNotMatch(source, /redirect\(`\/book/);
    assert.match(source, /plan=individual/);
});
