const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("./helpers/register-ts");

const {
    FOUNDING_MEMBER_NURTURE_STEPS,
    getFoundingMemberNurtureTransition,
} = require("../lib/auto-response.ts");
const { FORBIDDEN } = require("./business-model-truth-patterns");

function read(rel) {
    return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

test("founding-member nurture sequence advances immediate -> day 3 -> day 7 -> completed", () => {
    const startedAt = new Date("2026-06-12T12:00:00.000Z");

    const afterStep1 = getFoundingMemberNurtureTransition({
        currentStep: 1,
        startedAt,
        sentAt: startedAt,
    });
    assert.equal(afterStep1.status, "ACTIVE");
    assert.equal(afterStep1.step, 2);
    assert.equal(afterStep1.scheduledAt.toISOString(), "2026-06-15T12:00:00.000Z");

    const afterStep2 = getFoundingMemberNurtureTransition({
        currentStep: 2,
        startedAt,
        sentAt: new Date("2026-06-15T12:00:00.000Z"),
    });
    assert.equal(afterStep2.status, "ACTIVE");
    assert.equal(afterStep2.step, 3);
    assert.equal(afterStep2.scheduledAt.toISOString(), "2026-06-19T12:00:00.000Z");

    const afterStep3 = getFoundingMemberNurtureTransition({
        currentStep: 3,
        startedAt,
        sentAt: new Date("2026-06-19T12:00:00.000Z"),
    });
    assert.equal(afterStep3.status, "COMPLETED");
    assert.equal(afterStep3.step, 3);
    assert.equal(afterStep3.scheduledAt, null);
});

test("waitlist and lead helpers queue the founding-member nurture sequence", () => {
    const source = read("lib/auto-response.ts");
    assert.match(source, /export async function queueAutoResponseFromWaitlistSignup[\s\S]*enqueueFoundingMemberNurtureSequence/);
    assert.match(source, /export async function queueAutoResponseFromCampaignLead[\s\S]*enqueueFoundingMemberNurtureSequence/);
    assert.match(source, /export async function queueAutoResponseFromChatbotLead[\s\S]*enqueueFoundingMemberNurtureSequence/);
    assert.match(source, /processDueFoundingMemberNurtureSequences/);
    assert.match(source, /nurtureSequenceId_nurtureStep/);
});

test("nurture suppression is wired to unsubscribe and registration success paths", () => {
    const files = [
        "lib/auto-response.ts",
        "app/api/stripe/webhook/route.ts",
        "app/api/membership/activate/route.ts",
        "app/api/register/route.ts",
    ];

    for (const rel of files) {
        assert.match(
            read(rel),
            /stopFoundingMemberNurtureSequenceForEmail/,
            `${rel} must stop active nurture sequences`
        );
    }

    assert.match(read("app/api/stripe/webhook/route.ts"), /checkout\.session\.completed/);
    assert.match(read("app/api/stripe/webhook/route.ts"), /registered_member/);
    assert.match(read("lib/auto-response.ts"), /hard_bounce/);
    assert.match(read("lib/auto-response.ts"), /Recipient unsubscribed/);
});

test("founding-member nurture templates avoid forbidden business-model claims", () => {
    assert.equal(FOUNDING_MEMBER_NURTURE_STEPS.length, 3);
    assert.deepEqual(
        FOUNDING_MEMBER_NURTURE_STEPS.map((step) => step.delayDays),
        [0, 3, 7]
    );

    const copy = FOUNDING_MEMBER_NURTURE_STEPS.map((step) =>
        [step.subject, step.bodyTemplate, step.ctaLabel || ""].join("\n")
    ).join("\n\n");

    assert.match(copy, /\$99\/month/);
    assert.match(copy, /\$990\/year/);
    assert.match(copy, /no insurance games/i);
    assert.doesNotMatch(copy, /\$29/);

    for (const pattern of FORBIDDEN) {
        assert.doesNotMatch(copy, pattern, `nurture sequence copy matches forbidden claim ${pattern}`);
    }
});
