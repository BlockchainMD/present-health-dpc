/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");
const { US_STATES } = require("../data/us-states");
const { servedStates } = require("../data/served-states");

const prisma = new PrismaClient();

function md(lines) {
    return lines.filter(Boolean).join("\n").trim() + "\n";
}

function defaultMetaTitle(stateName) {
    return `Telehealth Direct Primary Care in ${stateName} | Present Health`;
}

function defaultMetaDescription(stateName) {
    return `Messaging-first primary care for ${stateName} residents. Present Health memberships are $99/month with no insurance required.`;
}

function buildStateContent(stateName) {
    // Keep this state-specific in the sense of "tailored copy", without making hard legal claims.
    const howItWorks = md([
        `Present Health is a telehealth-first Direct Primary Care (DPC) membership for ${stateName} residents.`,
        ``,
        `**What to expect:**`,
        `- **Join** online with one simple membership plan.`,
        `- **Schedule** a same/next-day virtual visit when you need care (plus async messaging for quick questions).`,
        `- **Get a plan** with follow-up, prevention planning, and coordination when you need in-person services.`,
        ``,
        `**Important note about telehealth:** care is provided based on where you are physically located at the time of the visit, and clinician licensing requirements can vary. If you travel, message us so we can help you plan the safest next step.`,
    ]);

    const rxLogistics = md([
        `When medically appropriate, we can discuss treatment options and send prescriptions to many local pharmacies in ${stateName}.`,
        ``,
        `**Typical prescription workflow:**`,
        `- We confirm your preferred pharmacy and medication history.`,
        `- We send an e-prescription and set expectations for refills and follow-up.`,
        `- If a prior authorization is needed, we coordinate the paperwork when possible.`,
        ``,
        `Some medications have additional restrictions and may require in-person evaluation depending on your situation and current rules. We’ll talk through options during your visit.`,
    ]);

    const labOptions = md([
        `If labs help clarify a diagnosis or track a chronic condition, we’ll order what’s needed and help you choose a convenient option in ${stateName}.`,
        ``,
        `**Lab options may include:**`,
        `- Using national lab networks with multiple draw sites`,
        `- Coordinating with local facilities when appropriate`,
        `- Reviewing outside results you already have`,
        ``,
        `We’ll interpret results with you and translate them into a concrete plan.`,
    ]);

    const emergencyProtocol = md([
        `**If you think you may be having a medical emergency, call 911 or go to the nearest emergency room immediately.**`,
        ``,
        `Examples include chest pain, severe shortness of breath, signs of stroke, severe allergic reaction, uncontrolled bleeding, or suicidal thoughts.`,
        ``,
        `For urgent but non-emergency issues, we can often help you decide the right next step via telehealth and coordinate follow-up after urgent care or ER visits.`,
    ]);

    const hsaNotes = md([
        `You can pay for membership using a card on file. Some members use HSA/FSA funds depending on their plan and current IRS rules.`,
        ``,
        `**HSA note:** eligibility can be nuanced and can depend on how your membership is structured and what your plan allows. This page is informational only and is not tax advice. Consult a tax professional for guidance specific to ${stateName}.`,
    ]);

    const faqs = [
        {
            question: `Is Present Health available to all ${stateName} residents?`,
            answer: md([
                `Present Health is available in select states based on clinician licensing and operational coverage. If you don’t see ${stateName} listed on our states hub, join the waitlist and we’ll notify you when availability expands.`,
            ]),
        },
        {
            question: `Do I need insurance to use Present Health in ${stateName}?`,
            answer: md([
                `No. Present Health is a membership model (Direct Primary Care). You can still keep insurance for emergencies, hospital care, and specialist services.`,
            ]),
        },
        {
            question: `Can you send prescriptions to my pharmacy in ${stateName}?`,
            answer: md([
                `When medically appropriate, we can often send e-prescriptions to many local pharmacies. Some medications have additional requirements; we’ll discuss options and next steps during your visit.`,
            ]),
        },
        {
            question: `Can you order labs in ${stateName}?`,
            answer: md([
                `Yes, when labs are medically necessary. We’ll help you choose a convenient draw site and review results with you.`,
            ]),
        },
        {
            question: `What happens if I’m traveling outside ${stateName}?`,
            answer: md([
                `Telehealth care depends on where you are physically located at the time of the visit. If you’re traveling, message us and we’ll help you decide the safest next step, which may include local in-person care.`,
            ]),
        },
        {
            question: `Is this emergency care?`,
            answer: md([
                `No. If you have emergency symptoms, call 911 or seek immediate in-person care. We’re here for primary care, prevention, and coordination before and after urgent events.`,
            ]),
        },
    ];

    return { howItWorks, rxLogistics, labOptions, emergencyProtocol, hsaNotes, faqs };
}

function isBlank(value) {
    if (value === null || value === undefined) return true;
    if (typeof value !== "string") return false;
    return value.trim().length === 0;
}

function faqsBlank(value) {
    if (!Array.isArray(value)) return true;
    return value.length === 0;
}

async function upsertState(state, { activeSlugs, shouldSetActive }) {
    const existing = await prisma.state.findUnique({ where: { slug: state.slug } });
    const content = buildStateContent(state.name);

    if (!existing) {
        await prisma.state.create({
            data: {
                name: state.name,
                slug: state.slug,
                isActive: shouldSetActive ? activeSlugs.has(state.slug) : false,
                metaTitle: defaultMetaTitle(state.name),
                metaDescription: defaultMetaDescription(state.name),
                telehealthRegulationsSummary: content.howItWorks,
                rxLogistics: content.rxLogistics,
                labOptions: content.labOptions,
                emergencyProtocol: content.emergencyProtocol,
                hsaNotes: content.hsaNotes,
                faqs: content.faqs,
            },
        });
        return { action: "created" };
    }

    const update = {
        name: state.name,
        ...(shouldSetActive ? { isActive: activeSlugs.has(state.slug) } : {}),
        ...(isBlank(existing.metaTitle) ? { metaTitle: defaultMetaTitle(state.name) } : {}),
        ...(isBlank(existing.metaDescription) ? { metaDescription: defaultMetaDescription(state.name) } : {}),
        ...(isBlank(existing.telehealthRegulationsSummary) ? { telehealthRegulationsSummary: content.howItWorks } : {}),
        ...(isBlank(existing.rxLogistics) ? { rxLogistics: content.rxLogistics } : {}),
        ...(isBlank(existing.labOptions) ? { labOptions: content.labOptions } : {}),
        ...(isBlank(existing.emergencyProtocol) ? { emergencyProtocol: content.emergencyProtocol } : {}),
        ...(isBlank(existing.hsaNotes) ? { hsaNotes: content.hsaNotes } : {}),
        ...(faqsBlank(existing.faqs) ? { faqs: content.faqs } : {}),
    };

    await prisma.state.update({
        where: { slug: state.slug },
        data: update,
    });

    return { action: "updated" };
}

async function main() {
    await prisma.$connect();

    const served = Array.isArray(servedStates) ? servedStates : [];
    const activeSlugs = new Set(served.map((s) => String(s.slug || "").trim()).filter(Boolean));
    const shouldSetActive = activeSlugs.size > 0;

    if (!shouldSetActive) {
        console.warn("[seed-us-states-content] data/served-states.js is empty. Seeding all states as INACTIVE. Populate servedStates to activate the 15 served states.");
    } else if (activeSlugs.size !== 15) {
        console.warn(`[seed-us-states-content] servedStates has ${activeSlugs.size} entries (expected 15). States will be activated exactly as listed.`);
    }

    let created = 0;
    let updated = 0;

    for (const state of US_STATES) {
        const res = await upsertState(state, { activeSlugs, shouldSetActive });
        if (res.action === "created") created += 1;
        if (res.action === "updated") updated += 1;
    }

    console.log(`[seed-us-states-content] Done. Created: ${created}, Updated: ${updated}.`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error("[seed-us-states-content] Failed:", err);
        await prisma.$disconnect();
        process.exit(1);
    });
