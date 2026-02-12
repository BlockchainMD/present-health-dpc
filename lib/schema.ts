import type { Article, Physician, State } from "@prisma/client";
import { absoluteUrl } from "@/lib/site-url";
import { markdownToPlainText } from "@/lib/markdown-plain";
import {
    EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS,
    MEMBERSHIP_ANNUAL_DOLLARS,
    MEMBERSHIP_MONTHLY_DOLLARS,
    SINGLE_VISIT_DOLLARS,
} from "@/lib/pricing";
import { stateDisplayName } from "@/lib/us-states";

export type SchemaBlock = Record<string, unknown>;

export type FaqItem = { question: string; answer: string };

export function coerceFaqs(value: unknown): FaqItem[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const obj = item as Record<string, unknown>;
            const question = typeof obj.question === "string" ? obj.question.trim() : "";
            const answer = typeof obj.answer === "string" ? obj.answer.trim() : "";
            if (!question || !answer) return null;
            return { question, answer };
        })
        .filter((x): x is FaqItem => Boolean(x));
}

function localPathToAbsolute(urlOrPath: string | null | undefined) {
    if (!urlOrPath) return undefined;
    const raw = String(urlOrPath).trim();
    if (!raw) return undefined;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (raw.startsWith("/")) return absoluteUrl(raw);
    return raw;
}

function slugToLabel(slug: string) {
    return String(slug || "")
        .split("-")
        .filter(Boolean)
        .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
        .join(" ");
}

export function schemaTypeList(blocks: SchemaBlock[]): string[] {
    const types = new Set<string>();
    for (const block of blocks) {
        const t = block?.["@type"];
        if (typeof t === "string" && t.trim()) types.add(t.trim());
        else if (Array.isArray(t)) {
            for (const x of t) {
                if (typeof x === "string" && x.trim()) types.add(x.trim());
            }
        }
    }
    return Array.from(types);
}

export function buildBreadcrumbSchema(pathname: string, labelOverrides?: Record<string, string>): SchemaBlock | null {
    const normalized = (() => {
        const raw = String(pathname || "").trim();
        if (!raw || raw === "/") return "/";
        return raw.endsWith("/") ? raw.slice(0, -1) : raw;
    })();

    if (normalized === "/") return null;
    const parts = normalized.split("/").filter(Boolean);

    const itemListElement: SchemaBlock[] = [
        {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteUrl("/"),
        },
    ];

    let current = "";
    for (let idx = 0; idx < parts.length; idx++) {
        current += `/${parts[idx]}`;
        const name = labelOverrides?.[current] || slugToLabel(parts[idx]);
        itemListElement.push({
            "@type": "ListItem",
            position: idx + 2,
            name,
            item: absoluteUrl(current),
        });
    }

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement,
    };
}

function faqSchema(faqs: FaqItem[]): SchemaBlock | null {
    if (!faqs.length) return null;
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: markdownToPlainText(faq.answer),
            },
        })),
    };
}

export function buildHomepageSchemas(): SchemaBlock[] {
    return [
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Present Health",
            url: absoluteUrl("/"),
        },
        {
            "@context": "https://schema.org",
            "@type": "MedicalBusiness",
            name: "Present Health",
            url: absoluteUrl("/"),
            description: "Telehealth-first Direct Primary Care membership with direct physician access and transparent pricing.",
            areaServed: "United States",
        },
    ];
}

export function buildAboutSchemas(practiceOverviewMarkdown: string): SchemaBlock[] {
    const description =
        markdownToPlainText(practiceOverviewMarkdown || "").slice(0, 240) || "Telehealth-first Direct Primary Care clinic.";

    const blocks: SchemaBlock[] = [
        {
            "@context": "https://schema.org",
            "@type": "MedicalClinic",
            name: "Present Health",
            url: absoluteUrl("/about"),
            description,
        },
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Present Health",
            url: absoluteUrl("/"),
        },
    ];

    const breadcrumb = buildBreadcrumbSchema("/about", { "/about": "About" });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

export function buildPhysicianSchemas(physician: Pick<Physician, "name" | "slug" | "bio" | "photoUrl" | "npiNumber" | "statesLicensed">): SchemaBlock[] {
    const path = `/our-physicians/${physician.slug}`;
    const states = Array.isArray(physician.statesLicensed) ? physician.statesLicensed.filter(Boolean) : [];

    const physicianSchema: SchemaBlock = {
        "@context": "https://schema.org",
        "@type": "Physician",
        name: physician.name,
        url: absoluteUrl(path),
        image: localPathToAbsolute(physician.photoUrl),
        description: physician.bio ? markdownToPlainText(physician.bio).slice(0, 320) : undefined,
        worksFor: {
            "@type": "MedicalClinic",
            name: "Present Health",
            url: absoluteUrl("/about"),
        },
        areaServed: states.map((code) => ({
            "@type": "AdministrativeArea",
            name: stateDisplayName(code),
        })),
        identifier: physician.npiNumber
            ? {
                "@type": "PropertyValue",
                propertyID: "NPI",
                value: physician.npiNumber,
            }
            : undefined,
    };

    const blocks = [physicianSchema];
    const breadcrumb = buildBreadcrumbSchema(path, {
        "/our-physicians": "Our Physicians",
        [path]: physician.name,
    });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

export function buildStateSchemas(state: Pick<State, "name" | "slug" | "faqs" | "telehealthRegulationsSummary">): SchemaBlock[] {
    const path = `/states/${state.slug}`;
    const faqs = coerceFaqs(state.faqs);

    const blocks: SchemaBlock[] = [
        {
            "@context": "https://schema.org",
            "@type": "MedicalClinic",
            name: "Present Health",
            url: absoluteUrl(path),
            description:
                markdownToPlainText(state.telehealthRegulationsSummary || "").slice(0, 220) ||
                `Telehealth Direct Primary Care in ${state.name}.`,
            areaServed: {
                "@type": "AdministrativeArea",
                name: state.name,
            },
        },
    ];

    const faq = faqSchema(faqs);
    if (faq) blocks.push(faq);

    const breadcrumb = buildBreadcrumbSchema(path, {
        "/states": "States",
        [path]: state.name,
    });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

type LearnArticleInput = Pick<
    Article,
    "id" | "slug" | "title" | "content" | "excerpt" | "schemaType" | "featuredImage" | "faqs" | "createdAt" | "updatedAt" | "publishedAt"
> & {
    authorPhysician?: Pick<Physician, "name" | "slug" | "isActive"> | null;
};

export function buildLearnArticleSchemas(article: LearnArticleInput): SchemaBlock[] {
    const path = `/learn/${article.slug || article.id}`;
    const publishedDate = article.publishedAt || article.createdAt;
    const description =
        (article.excerpt || "").trim() || markdownToPlainText(article.content || "").slice(0, 220) || undefined;

    const authorName = article.authorPhysician?.name || "Present Health Team";
    const authorUrl =
        article.authorPhysician?.slug && article.authorPhysician.isActive
            ? absoluteUrl(`/our-physicians/${article.authorPhysician.slug}`)
            : absoluteUrl("/about");

    const schemaType = (article.schemaType || "Article").trim();
    const isHowTo = schemaType === "HowTo";

    const base: SchemaBlock = isHowTo
        ? {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: article.title,
            description,
            datePublished: publishedDate.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            author: {
                "@type": "Person",
                name: authorName,
                url: authorUrl,
            },
            mainEntityOfPage: absoluteUrl(path),
        }
        : {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description,
            datePublished: publishedDate.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            author: {
                "@type": "Person",
                name: authorName,
                url: authorUrl,
            },
            publisher: {
                "@type": "Organization",
                name: "Present Health",
                url: absoluteUrl("/"),
            },
            mainEntityOfPage: absoluteUrl(path),
        };

    const image = localPathToAbsolute(article.featuredImage);
    if (image) base.image = image;

    const blocks: SchemaBlock[] = [base];

    const faqs = coerceFaqs(article.faqs);
    const faq = faqSchema(faqs);
    if (faq) blocks.push(faq);

    const breadcrumb = buildBreadcrumbSchema(path, {
        "/learn": "Learn",
        [path]: article.title,
    });
    if (breadcrumb) blocks.push(breadcrumb);

    return blocks;
}

export function buildPricingSchemas(): SchemaBlock[] {
    const blocks: SchemaBlock[] = [
        {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Present Health Membership",
            description:
                "Messaging-first primary care membership with secure messaging, video when clinically appropriate, and no per-visit fees.",
            brand: {
                "@type": "Brand",
                name: "Present Health",
            },
            offers: [
                {
                    "@type": "Offer",
                    priceCurrency: "USD",
                    price: String(MEMBERSHIP_MONTHLY_DOLLARS),
                    url: absoluteUrl("/pricing"),
                    priceSpecification: {
                        "@type": "UnitPriceSpecification",
                        priceCurrency: "USD",
                        price: String(MEMBERSHIP_MONTHLY_DOLLARS),
                        unitText: "month",
                    },
                },
                {
                    "@type": "Offer",
                    priceCurrency: "USD",
                    price: String(MEMBERSHIP_ANNUAL_DOLLARS),
                    url: absoluteUrl("/pricing"),
                    priceSpecification: {
                        "@type": "UnitPriceSpecification",
                        priceCurrency: "USD",
                        price: String(MEMBERSHIP_ANNUAL_DOLLARS),
                        unitText: "year",
                    },
                },
            ],
        },
        {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Present Health Single Visit",
            description: "One message-based or video clinical encounter for a specific health concern.",
            brand: {
                "@type": "Brand",
                name: "Present Health",
            },
            offers: {
                "@type": "Offer",
                priceCurrency: "USD",
                price: String(SINGLE_VISIT_DOLLARS),
                url: absoluteUrl("/visit"),
                priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    priceCurrency: "USD",
                    price: String(SINGLE_VISIT_DOLLARS),
                    unitText: "visit",
                },
            },
        },
        {
        "@context": "https://schema.org",
        "@type": "Product",
        name: "Present Health Employer / Group Membership",
        description: `Employer groups at $${EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS}/employee/month.`,
        brand: {
            "@type": "Brand",
            name: "Present Health",
        },
        offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price: String(EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS),
            url: absoluteUrl("/for-employers"),
            priceSpecification: {
                "@type": "UnitPriceSpecification",
                priceCurrency: "USD",
                price: String(EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS),
                unitText: "employee / month",
            },
        },
        },
    ];

    const breadcrumb = buildBreadcrumbSchema("/pricing", { "/pricing": "Pricing" });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

export function buildForEmployersSchemas(faqs: FaqItem[]): SchemaBlock[] {
    const blocks: SchemaBlock[] = [
        {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "For Employers",
            description: "Employer and group membership options for Present Health telehealth-first Direct Primary Care.",
            url: absoluteUrl("/for-employers"),
        },
    ];

    const faq = faqSchema(faqs);
    if (faq) blocks.push(faq);

    const breadcrumb = buildBreadcrumbSchema("/for-employers", { "/for-employers": "For Employers" });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

export function buildOurPhysiciansHubSchemas(): SchemaBlock[] {
    const path = "/our-physicians";
    const blocks: SchemaBlock[] = [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Our Physicians",
            description: "Meet the Present Health physicians providing telehealth-first Direct Primary Care.",
            url: absoluteUrl(path),
        },
    ];
    const breadcrumb = buildBreadcrumbSchema(path, { [path]: "Our Physicians" });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

export function buildStatesHubSchemas(): SchemaBlock[] {
    const path = "/states";
    const blocks: SchemaBlock[] = [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "States We Serve",
            description: "Present Health is available in select states. Browse state pages for telehealth workflow, prescriptions, labs, and FAQs.",
            url: absoluteUrl(path),
        },
    ];
    const breadcrumb = buildBreadcrumbSchema(path, { [path]: "States" });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

export function buildLearnHubSchemas(): SchemaBlock[] {
    const path = "/learn";
    const blocks: SchemaBlock[] = [
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Learn",
            description: "Educational articles on primary care, telehealth, and preventive health from Present Health.",
            url: absoluteUrl(path),
        },
    ];
    const breadcrumb = buildBreadcrumbSchema(path, { [path]: "Learn" });
    if (breadcrumb) blocks.push(breadcrumb);
    return blocks;
}

export function validateSchemaBlockBasics(blocks: SchemaBlock[]): string[] {
    const issues: string[] = [];
    if (!blocks.length) {
        issues.push("No schema blocks generated.");
        return issues;
    }

    blocks.forEach((block, idx) => {
        const context = block?.["@context"];
        if (context !== "https://schema.org") {
            issues.push(`Block #${idx + 1} is missing @context=https://schema.org.`);
        }
        const type = block?.["@type"];
        if (!(typeof type === "string" && type.trim()) && !(Array.isArray(type) && type.length > 0)) {
            issues.push(`Block #${idx + 1} is missing @type.`);
        }
    });
    return issues;
}
