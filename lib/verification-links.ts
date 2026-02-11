import { stateCode } from "@/lib/us-states";

export function npiRegistryProviderUrl(npiNumber?: string | null) {
    const raw = typeof npiNumber === "string" ? npiNumber.trim() : "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) {
        return `https://npiregistry.cms.hhs.gov/provider-view/${digits}`;
    }
    return "https://npiregistry.cms.hhs.gov/";
}

// ABFM's public verification tool.
export const ABFM_VERIFICATION_URL = "https://portfolio.theabfm.org/diplomate/verify.aspx";

export function fsmbStateMedicalBoardUrl(stateNameOrCode: string) {
    const code = stateCode(stateNameOrCode);
    if (!code) {
        return "https://www.fsmb.org/contact-a-state-medical-board/";
    }
    return `https://www.fsmb.org/contact-a-state-medical-board/#${encodeURIComponent(code)}`;
}

