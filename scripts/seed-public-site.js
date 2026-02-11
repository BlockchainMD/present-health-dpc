const { PrismaClient } = require("@prisma/client");
const { servedStates } = require("../data/served-states");

const prisma = new PrismaClient();

function assertValidSeed() {
    if (!Array.isArray(servedStates)) {
        throw new Error("data/served-states.js must export { servedStates: [...] }");
    }
    for (const s of servedStates) {
        if (!s || typeof s !== "object") throw new Error("Each served state must be an object: { name, slug }");
        if (typeof s.name !== "string" || !s.name.trim()) throw new Error("Each served state must include a non-empty `name`");
        if (typeof s.slug !== "string" || !s.slug.trim()) throw new Error("Each served state must include a non-empty `slug`");
    }
}

async function upsertDefaultPhysician() {
    // Minimal seed so `/our-physicians` has a sane default.
    await prisma.physician.upsert({
        where: { slug: "dr-j" },
        update: { isActive: true },
        create: {
            name: "Dr. J",
            slug: "dr-j",
            credentials: "MD",
            boardCertification: "Board-Certified Family Medicine",
            photoUrl: "/doctor-portrait.jpg",
            yearsExperience: 10,
            isActive: true,
            bio: "",
            statesLicensed: [],
        },
    });
}

async function seedStates() {
    assertValidSeed();

    for (const state of servedStates) {
        await prisma.state.upsert({
            where: { slug: state.slug },
            update: {
                name: state.name,
                isActive: true,
            },
            create: {
                name: state.name,
                slug: state.slug,
                isActive: true,
                telehealthRegulationsSummary: "",
                rxLogistics: "",
                labOptions: "",
                emergencyProtocol: "",
                faqs: [],
                hsaNotes: "",
            },
        });
    }
}

async function main() {
    await prisma.$connect();
    await upsertDefaultPhysician();

    if (Array.isArray(servedStates) && servedStates.length) {
        await seedStates();
    } else {
        console.warn(
            "[seed-public-site] No served states configured. Update data/served-states.js, then re-run this script to seed `/states`."
        );
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error("[seed-public-site] Failed:", err);
        await prisma.$disconnect();
        process.exit(1);
    });

