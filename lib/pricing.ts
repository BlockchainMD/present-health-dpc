export type CoverageType = "individual" | "couple" | "family";
export type BillingCadence = "monthly" | "annual";

export const MEMBERSHIP_MONTHLY_DOLLARS = 99;
export const MEMBERSHIP_ANNUAL_DOLLARS = 990;
export const MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS = 198;
export const HOUSEHOLD_MONTHLY_DOLLARS = 179;
export const HOUSEHOLD_ANNUAL_DOLLARS = 1790;
export const HOUSEHOLD_ANNUAL_SAVINGS_DOLLARS = 358;
export const SINGLE_VISIT_DOLLARS = 99;
// Internal CRM baseline only (never rendered publicly): employer groups are
// priced at the individual membership rate until a dedicated employer tier is
// decided. See medbusy strategy/business-model.md ("$99/employee").
export const EMPLOYER_PER_EMPLOYEE_MONTHLY_DOLLARS = 99;

export const MEMBERSHIP_TIERS: Record<
    CoverageType,
    {
        name: string;
        monthlyDollars: number;
        annualDollars: number;
        annualSavingsDollars: number;
        tagline: string;
        includes: string[];
    }
> = {
    individual: {
        name: "Individual",
        monthlyDollars: MEMBERSHIP_MONTHLY_DOLLARS,
        annualDollars: MEMBERSHIP_ANNUAL_DOLLARS,
        annualSavingsDollars: MEMBERSHIP_ANNUAL_SAVINGS_DOLLARS,
        tagline: "One adult. Full membership.",
        includes: [
            "Baseline labs ordered in week one — ApoB, lipids, blood pressure review",
            "A written cardiovascular risk-reduction plan from your physician",
            "Unlimited secure messaging (text, photo, voice memo)",
            "Typical response time: within 4 business hours (M-F 8am-8pm ET)",
            "Video visits when clinically appropriate",
            "Prescriptions, labs, and scheduled re-tests to track your trend",
        ],
    },
    couple: {
        name: "Household",
        monthlyDollars: HOUSEHOLD_MONTHLY_DOLLARS,
        annualDollars: HOUSEHOLD_ANNUAL_DOLLARS,
        annualSavingsDollars: HOUSEHOLD_ANNUAL_SAVINGS_DOLLARS,
        tagline: "Two adults, one membership.",
        includes: [
            "Everything in Individual — for two adults in the same household",
            "Each member gets their own baseline labs and prevention plan",
            "Unlimited secure messaging for both members",
            "Typical response time: within 4 business hours (M-F 8am-8pm ET)",
            "Video visits when clinically appropriate",
            "Under the $300/month household HSA cap for direct primary care",
        ],
    },
    family: {
        name: "Household",
        monthlyDollars: HOUSEHOLD_MONTHLY_DOLLARS,
        annualDollars: HOUSEHOLD_ANNUAL_DOLLARS,
        annualSavingsDollars: HOUSEHOLD_ANNUAL_SAVINGS_DOLLARS,
        tagline: "Two adults, one membership.",
        includes: [
            "Everything in Individual — for two adults in the same household",
            "Each member gets their own baseline labs and prevention plan",
            "Unlimited secure messaging for both members",
            "Typical response time: within 4 business hours (M-F 8am-8pm ET)",
            "Video visits when clinically appropriate",
            "Under the $300/month household HSA cap for direct primary care",
        ],
    },
};

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
    if (value === "couple" || value === "household") return "couple";
    if (value === "family") return "family";
    return "individual";
}

export function normalizeBillingCadence(value: unknown): BillingCadence {
    if (value === "annual" || value === "yearly") return "annual";
    return "monthly";
}
