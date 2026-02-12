export type CoverageType = "individual" | "couple" | "family";

export const MEMBERSHIP_MONTHLY_DOLLARS = 49;
export const MEMBERSHIP_ANNUAL_DOLLARS = 490;
export const MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS = 98;
export const SINGLE_VISIT_DOLLARS = 49;
export const EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS = 29;

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
        name: "Membership",
        monthlyDollars: MEMBERSHIP_MONTHLY_DOLLARS,
        tagline: "One plan. Adults 18+.",
        includes: [
            "Unlimited secure messaging (text, photo, voice memo)",
            "Responses within 4 business hours (M-F 8am-8pm ET)",
            "Video visits when clinically appropriate",
            "Prescriptions, labs, and ongoing care support",
        ],
    },
    couple: {
        name: "Membership",
        monthlyDollars: MEMBERSHIP_MONTHLY_DOLLARS,
        tagline: "One plan. Adults 18+.",
        includes: [
            "Unlimited secure messaging (text, photo, voice memo)",
            "Responses within 4 business hours (M-F 8am-8pm ET)",
            "Video visits when clinically appropriate",
            "Prescriptions, labs, and ongoing care support",
        ],
    },
    family: {
        name: "Membership",
        monthlyDollars: MEMBERSHIP_MONTHLY_DOLLARS,
        tagline: "One plan. Adults 18+.",
        includes: [
            "Unlimited secure messaging (text, photo, voice memo)",
            "Responses within 4 business hours (M-F 8am-8pm ET)",
            "Video visits when clinically appropriate",
            "Prescriptions, labs, and ongoing care support",
        ],
    },
};

export const EMPLOYER_TIER = {
    name: "Employer / Group",
    monthlyPerEmployeeDollars: EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS,
    minEmployees: 1,
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
