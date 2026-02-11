import { stateCode } from "@/lib/us-states";

export type UsRegion = "Northeast" | "Midwest" | "South" | "West";

const REGION_BY_CODE: Record<string, UsRegion> = {
    // Northeast
    CT: "Northeast",
    ME: "Northeast",
    MA: "Northeast",
    NH: "Northeast",
    RI: "Northeast",
    VT: "Northeast",
    NJ: "Northeast",
    NY: "Northeast",
    PA: "Northeast",

    // Midwest
    IL: "Midwest",
    IN: "Midwest",
    MI: "Midwest",
    OH: "Midwest",
    WI: "Midwest",
    IA: "Midwest",
    KS: "Midwest",
    MN: "Midwest",
    MO: "Midwest",
    NE: "Midwest",
    ND: "Midwest",
    SD: "Midwest",

    // South
    DE: "South",
    DC: "South",
    FL: "South",
    GA: "South",
    MD: "South",
    NC: "South",
    SC: "South",
    VA: "South",
    WV: "South",
    AL: "South",
    KY: "South",
    MS: "South",
    TN: "South",
    AR: "South",
    LA: "South",
    OK: "South",
    TX: "South",

    // West
    AK: "West",
    AZ: "West",
    CA: "West",
    CO: "West",
    HI: "West",
    ID: "West",
    MT: "West",
    NV: "West",
    NM: "West",
    OR: "West",
    UT: "West",
    WA: "West",
    WY: "West",
};

export function regionForStateCode(code: string): UsRegion | null {
    const upper = String(code || "").trim().toUpperCase();
    return REGION_BY_CODE[upper] || null;
}

export function regionForState(value: string): UsRegion | null {
    const code = stateCode(value);
    return code ? regionForStateCode(code) : null;
}

