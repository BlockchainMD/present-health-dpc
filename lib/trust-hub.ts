import { prisma } from "@/lib/prisma";

export type TrustHubAboutBlocks = {
    practiceOverviewMarkdown: string;
    dpcCoversMarkdown: string;
    dpcDoesntCoverMarkdown: string;
    hipaaPrivacyMarkdown: string;
};

const KEY_PRACTICE_OVERVIEW = "trustHub:about:practiceOverview";
const KEY_DPC_COVERS = "trustHub:about:dpcCovers";
const KEY_DPC_DOESNT_COVER = "trustHub:about:dpcDoesntCover";
const KEY_HIPAA_PRIVACY = "trustHub:about:hipaaPrivacy";

function valueToMarkdown(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value !== "object") return null;
    const obj = value as Record<string, unknown>;
    if (typeof obj.markdown === "string") return obj.markdown;
    if (typeof obj.content === "string") return obj.content;
    return null;
}

async function loadMarkdown(key: string, fallbackMarkdown: string) {
    try {
        const row = await prisma.contentStrategy.findUnique({ where: { key } });
        const markdown = valueToMarkdown(row?.value);
        return markdown ?? fallbackMarkdown;
    } catch (error) {
        console.error("[trust-hub] Failed to load content block", { key, error });
        return fallbackMarkdown;
    }
}

export async function getTrustHubAboutBlocks(): Promise<TrustHubAboutBlocks> {
    const defaults: TrustHubAboutBlocks = {
        practiceOverviewMarkdown:
            "Present Health is a **telehealth-first Direct Primary Care (DPC)** clinic. Instead of billing insurance for primary care, members pay a flat monthly fee for access and ongoing guidance.\n\n**How it works:** join as a member, book a visit when you need it, and communicate directly with your physician for follow-ups and care planning.\n",
        dpcCoversMarkdown:
            "- Primary care visits (video/phone when appropriate)\n- Prevention planning and health optimization\n- Follow-ups, care coordination, and medication review\n- Clear expectations and transparent membership pricing\n",
        dpcDoesntCoverMarkdown:
            "- Emergency care (call 911 for emergencies)\n- Hospitalizations and surgeries\n- Specialist fees\n- Imaging and labs (typically billed separately by third parties)\n",
        hipaaPrivacyMarkdown:
            "We take privacy seriously. Present Health follows HIPAA requirements and uses secure systems to protect your health information. If you have questions about privacy practices, contact us at **hello@presenthealthmd.com**.\n",
    };

    const [practiceOverviewMarkdown, dpcCoversMarkdown, dpcDoesntCoverMarkdown, hipaaPrivacyMarkdown] =
        await Promise.all([
            loadMarkdown(KEY_PRACTICE_OVERVIEW, defaults.practiceOverviewMarkdown),
            loadMarkdown(KEY_DPC_COVERS, defaults.dpcCoversMarkdown),
            loadMarkdown(KEY_DPC_DOESNT_COVER, defaults.dpcDoesntCoverMarkdown),
            loadMarkdown(KEY_HIPAA_PRIVACY, defaults.hipaaPrivacyMarkdown),
        ]);

    return { practiceOverviewMarkdown, dpcCoversMarkdown, dpcDoesntCoverMarkdown, hipaaPrivacyMarkdown };
}

export async function upsertTrustHubAboutBlocks(next: Partial<TrustHubAboutBlocks>) {
    const entries: Array<[string, string | undefined]> = [
        [KEY_PRACTICE_OVERVIEW, next.practiceOverviewMarkdown],
        [KEY_DPC_COVERS, next.dpcCoversMarkdown],
        [KEY_DPC_DOESNT_COVER, next.dpcDoesntCoverMarkdown],
        [KEY_HIPAA_PRIVACY, next.hipaaPrivacyMarkdown],
    ];

    for (const [key, markdown] of entries) {
        if (markdown === undefined) continue;
        await prisma.contentStrategy.upsert({
            where: { key },
            update: { value: { markdown, updatedAt: new Date().toISOString() } as any },
            create: { key, value: { markdown, updatedAt: new Date().toISOString() } as any },
        });
    }
}

