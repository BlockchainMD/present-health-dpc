export type CoverageType = "individual" | "couple" | "family";

export const MEMBERSHIP_TIERS: Record<
    CoverageType,
    {
        name: string;
        monthlyDollars: number;
        tagline: string;
        includes: string[];
    }
> = {
    individual: {
        name: "Individual",
        monthlyDollars: 99,
        tagline: "For one adult member.",
        includes: ["Telehealth-first primary care", "Direct messaging and follow-ups", "Same/next-day visits when available"],
    },
    couple: {
        name: "Couple",
        monthlyDollars: 179,
        tagline: "For two adults. Save about 10% vs two individual memberships.",
        includes: ["Two adult members", "Telehealth-first primary care", "Direct messaging and follow-ups"],
    },
    family: {
        name: "Family",
        monthlyDollars: 249,
        tagline: "Two adults plus children under 18.",
        includes: ["Two adult members", "Children under 18 included", "Telehealth-first primary care for the household"],
    },
};

export const EMPLOYER_TIER = {
    name: "Employer / Group",
    monthlyPerEmployeeDollars: 89,
    minEmployees: 10,
} as const;

// Default insurance premium inputs for the comparison calculator.
// Note: users should replace these with their real premium.
export const DEFAULT_INSURANCE_PREMIUMS_DOLLARS: Record<CoverageType, number> = {
    individual: 477,
    couple: 924,
    family: 1378,
};

export type FilingStatus = "single" | "married_filing_jointly";

export const DEFAULT_MARGINAL_TAX_RATE: Record<FilingStatus, number> = {
    single: 0.22,
    married_filing_jointly: 0.22,
};

export function normalizeCoverageType(value: unknown): CoverageType {
    if (value === "couple") return "couple";
    if (value === "family") return "family";
    return "individual";
}
