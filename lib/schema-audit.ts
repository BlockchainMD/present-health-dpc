import { prisma } from "@/lib/prisma";
import { getEmployerFaqs } from "@/lib/employers";
import { getTrustHubAboutBlocks } from "@/lib/trust-hub";
import {
    SchemaBlock,
    buildAboutSchemas,
    buildForEmployersSchemas,
    buildHomepageSchemas,
    buildLearnArticleSchemas,
    buildLearnHubSchemas,
    buildOurPhysiciansHubSchemas,
    buildPricingSchemas,
    buildStateSchemas,
    buildStatesHubSchemas,
    buildPhysicianSchemas,
    coerceFaqs,
    schemaTypeList,
    validateSchemaBlockBasics,
} from "@/lib/schema";

export type SchemaAuditRecord = {
    path: string;
    pageType: string;
    label: string;
    schemaTypes: string[];
    missing: boolean;
    issues: string[];
    blocks: SchemaBlock[];
};

function withAudit(
    path: string,
    pageType: string,
    label: string,
    blocks: SchemaBlock[],
    additionalIssues: string[] = []
): SchemaAuditRecord {
    const issues = [...validateSchemaBlockBasics(blocks), ...additionalIssues];
    return {
        path,
        pageType,
        label,
        schemaTypes: schemaTypeList(blocks),
        missing: blocks.length === 0,
        issues,
        blocks,
    };
}

export async function generateSchemaForPath(path: string): Promise<SchemaBlock[]> {
    const normalized = (() => {
        const raw = String(path || "").trim();
        if (!raw) return "/";
        return raw.startsWith("/") ? raw : `/${raw}`;
    })();

    if (normalized === "/") return buildHomepageSchemas();
    if (normalized === "/about") {
        const blocks = await getTrustHubAboutBlocks();
        return buildAboutSchemas(blocks.practiceOverviewMarkdown);
    }
    if (normalized === "/pricing") return buildPricingSchemas();
    if (normalized === "/for-employers") {
        const faqs = await getEmployerFaqs();
        return buildForEmployersSchemas(faqs);
    }
    if (normalized === "/our-physicians") return buildOurPhysiciansHubSchemas();
    if (normalized === "/states") return buildStatesHubSchemas();
    if (normalized === "/learn") return buildLearnHubSchemas();

    if (normalized.startsWith("/our-physicians/")) {
        const slug = normalized.split("/")[2] || "";
        if (!slug) return [];
        const physician = await prisma.physician.findUnique({
            where: { slug },
            select: {
                name: true,
                slug: true,
                bio: true,
                photoUrl: true,
                npiNumber: true,
                statesLicensed: true,
                isActive: true,
            },
        });
        if (!physician || !physician.isActive) return [];
        return buildPhysicianSchemas(physician);
    }

    if (normalized.startsWith("/states/")) {
        const slug = normalized.split("/")[2] || "";
        if (!slug) return [];
        const state = await prisma.state.findUnique({
            where: { slug },
            select: {
                name: true,
                slug: true,
                isActive: true,
                faqs: true,
                telehealthRegulationsSummary: true,
            },
        });
        if (!state || !state.isActive) return [];
        return buildStateSchemas(state);
    }

    if (normalized.startsWith("/learn/")) {
        const slug = normalized.split("/")[2] || "";
        if (!slug) return [];
        const now = new Date();
        const article = await prisma.article.findFirst({
            where: {
                slug,
                status: "PUBLISHED",
                OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
            },
            include: {
                authorPhysician: {
                    select: { name: true, slug: true, isActive: true, credentials: true, npiNumber: true },
                },
            },
        });
        if (!article) return [];
        return buildLearnArticleSchemas(article);
    }

    return [];
}

export async function buildSchemaAuditReport(): Promise<SchemaAuditRecord[]> {
    const [aboutBlocks, employerFaqs, physicians, states, articles] = await Promise.all([
        getTrustHubAboutBlocks(),
        getEmployerFaqs(),
        prisma.physician.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                slug: true,
                bio: true,
                photoUrl: true,
                npiNumber: true,
                statesLicensed: true,
            },
        }),
        prisma.state.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                slug: true,
                faqs: true,
                telehealthRegulationsSummary: true,
            },
        }),
        prisma.article.findMany({
            where: {
                status: "PUBLISHED",
                OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
            },
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            take: 500,
            include: {
                authorPhysician: {
                    select: { name: true, slug: true, isActive: true },
                },
            },
        }),
    ]);

    const records: SchemaAuditRecord[] = [];

    records.push(withAudit("/", "homepage", "Homepage", buildHomepageSchemas()));
    records.push(withAudit("/about", "about", "About", buildAboutSchemas(aboutBlocks.practiceOverviewMarkdown)));
    records.push(withAudit("/pricing", "pricing", "Pricing", buildPricingSchemas()));
    records.push(withAudit("/for-employers", "for-employers", "For Employers", buildForEmployersSchemas(employerFaqs)));
    records.push(withAudit("/our-physicians", "physician-hub", "Our Physicians Hub", buildOurPhysiciansHubSchemas()));
    records.push(withAudit("/states", "states-hub", "States Hub", buildStatesHubSchemas()));
    records.push(withAudit("/learn", "learn-hub", "Learn Hub", buildLearnHubSchemas()));

    for (const physician of physicians) {
        const path = `/our-physicians/${physician.slug}`;
        const blocks = buildPhysicianSchemas(physician);
        const physicianBlock = blocks.find((b) => b["@type"] === "Physician");
        const issues: string[] = [];
        const name = physicianBlock?.name;
        if (typeof name !== "string" || name !== physician.name) {
            issues.push(`Physician name mismatch. Visible="${physician.name}", schema="${String(name || "")}".`);
        }
        if (physician.npiNumber) {
            const idValue = (physicianBlock?.identifier as any)?.value;
            if (idValue !== physician.npiNumber) {
                issues.push("NPI identifier mismatch between schema and profile data.");
            }
        }
        records.push(withAudit(path, "physician-profile", `Physician: ${physician.name}`, blocks, issues));
    }

    for (const state of states) {
        const path = `/states/${state.slug}`;
        const blocks = buildStateSchemas(state);
        const clinic = blocks.find((b) => b["@type"] === "MedicalClinic");
        const areaName = (clinic?.areaServed as any)?.name;
        const issues: string[] = [];
        if (areaName !== state.name) {
            issues.push(`areaServed mismatch. Visible="${state.name}", schema="${String(areaName || "")}".`);
        }
        const faqCountVisible = coerceFaqs(state.faqs).length;
        const faqPage = blocks.find((b) => b["@type"] === "FAQPage");
        const faqCountSchema = Array.isArray((faqPage as any)?.mainEntity) ? (faqPage as any).mainEntity.length : 0;
        if (faqCountVisible !== faqCountSchema) {
            issues.push(`FAQ count mismatch. Visible=${faqCountVisible}, schema=${faqCountSchema}.`);
        }
        records.push(withAudit(path, "state-page", `State: ${state.name}`, blocks, issues));
    }

    for (const article of articles) {
        const path = `/learn/${article.slug || article.id}`;
        const blocks = buildLearnArticleSchemas(article as any);
        const articleBlock = blocks.find((b) => b["@type"] === "Article" || b["@type"] === "HowTo");
        const expectedType = (article.schemaType || "Article").trim() === "HowTo" ? "HowTo" : "Article";
        const issues: string[] = [];
        if (!articleBlock || articleBlock["@type"] !== expectedType) {
            issues.push(`Primary schema type mismatch. Expected ${expectedType}.`);
        }
        const authorNameVisible = article.authorPhysician?.name || "Present Health Team";
        const authorNameSchema = ((articleBlock as any)?.author as any)?.name;
        if (authorNameSchema !== authorNameVisible) {
            issues.push(`Author mismatch. Visible="${authorNameVisible}", schema="${String(authorNameSchema || "")}".`);
        }
        const faqVisible = coerceFaqs(article.faqs).length;
        const faqBlock = blocks.find((b) => b["@type"] === "FAQPage");
        const faqSchemaCount = Array.isArray((faqBlock as any)?.mainEntity) ? (faqBlock as any).mainEntity.length : 0;
        if (faqVisible > 0 && faqSchemaCount !== faqVisible) {
            issues.push(`FAQ count mismatch. Visible=${faqVisible}, schema=${faqSchemaCount}.`);
        }
        records.push(withAudit(path, "learn-article", `Learn: ${article.title}`, blocks, issues));
    }

    return records.sort((a, b) => a.path.localeCompare(b.path));
}

