export const CHATBOT_MAX_MESSAGES_PER_SESSION = 20;

export const CHATBOT_MEDICAL_REDIRECT_MESSAGE =
    "I'm not able to provide medical advice, but that's exactly the kind of thing your Present Health physician can help with! Would you like to learn about joining?";

export const CHATBOT_PAGE_OPTIONS = [
    { path: "/", label: "Homepage" },
    { path: "/how-it-works", label: "How It Works" },
    { path: "/pricing", label: "Pricing" },
    { path: "/join", label: "Join" },
    { path: "/our-physicians", label: "Our Physicians" },
    { path: "/states", label: "States" },
    { path: "/learn", label: "Learn" },
    { path: "/for-employers", label: "For Employers" },
    { path: "/about", label: "About" },
] as const;

export type ChatbotPagePath = (typeof CHATBOT_PAGE_OPTIONS)[number]["path"];

export type ChatbotConfig = {
    enabled: boolean;
    showOnAllPublicPages: boolean;
    pageToggles: Record<string, boolean>;
    knowledgeBase: string;
    welcomeMessage: string;
};

export function defaultPageToggles(): Record<string, boolean> {
    return Object.fromEntries(CHATBOT_PAGE_OPTIONS.map((x) => [x.path, x.path === "/join"]));
}

export const DEFAULT_CHATBOT_KNOWLEDGE_BASE = [
    "Present Health is a telehealth-first Direct Primary Care clinic.",
    "Membership costs: $49/month or $490/year (save $98).",
    "Single visit option: $49 per visit.",
    "Employer plans: $29/employee/month.",
    "Members get their own dedicated family physician (same doctor every visit).",
    "Unlimited telehealth visits, no copays, no surprise bills.",
    "Present Health can prescribe medications, order labs, manage chronic conditions, and provide preventive care.",
    "Present Health does not provide emergency care, surgery, specialist procedures, or imaging.",
].join("\n");

export const DEFAULT_CHATBOT_WELCOME_MESSAGE =
    "Hi! I'm the Present Health virtual assistant. I can help with pricing, state availability, and how to join. I can't provide medical advice.";

export const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
    enabled: true,
    showOnAllPublicPages: false,
    pageToggles: defaultPageToggles(),
    knowledgeBase: DEFAULT_CHATBOT_KNOWLEDGE_BASE,
    welcomeMessage: DEFAULT_CHATBOT_WELCOME_MESSAGE,
};

export function normalizePathname(pathname: string): string {
    const raw = String(pathname || "").split("?")[0].split("#")[0].trim();
    if (!raw) return "/";
    const collapsed = raw.replace(/\/{2,}/g, "/");
    if (!collapsed || collapsed === "/") return "/";
    const withoutTrailing = collapsed.replace(/\/+$/, "");
    return withoutTrailing || "/";
}

export function chatPageKeyFromPathname(pathname: string): ChatbotPagePath | null {
    const normalized = normalizePathname(pathname);
    if (normalized === "/") return "/";

    const options = CHATBOT_PAGE_OPTIONS.filter((x) => x.path !== "/").sort((a, b) => b.path.length - a.path.length);
    for (const option of options) {
        if (normalized === option.path || normalized.startsWith(`${option.path}/`)) {
            return option.path;
        }
    }
    return null;
}

export function normalizePageToggles(input: unknown): Record<string, boolean> {
    const next = defaultPageToggles();
    if (!input || typeof input !== "object") return next;
    const obj = input as Record<string, unknown>;
    for (const option of CHATBOT_PAGE_OPTIONS) {
        if (typeof obj[option.path] === "boolean") {
            next[option.path] = obj[option.path] as boolean;
        }
    }
    return next;
}

export function isChatbotEnabledForPath(
    config: Pick<ChatbotConfig, "enabled" | "showOnAllPublicPages" | "pageToggles">,
    pathname: string
) {
    if (!config.enabled) return false;
    const key = chatPageKeyFromPathname(pathname);

    if (config.showOnAllPublicPages) {
        if (!key) return true;
        return config.pageToggles[key] !== false;
    }

    if (!key) return false;
    return config.pageToggles[key] === true;
}

export function clipText(value: string, maxChars = 2000) {
    const text = String(value || "").trim();
    const limit = Number.isFinite(maxChars) ? Math.max(0, Math.trunc(maxChars)) : 0;
    if (limit === 0) return "";
    if (text.length <= limit) return text;
    if (limit <= 3) return text.slice(0, limit);
    return `${text.slice(0, limit - 3)}...`;
}

export function sanitizeMessageForStorage(value: string, redact = false) {
    if (redact) return "[REDACTED: medical/PHI content omitted]";
    return clipText(value, 3000);
}

function hasAny(patterns: RegExp[], text: string) {
    return patterns.some((rx) => rx.test(text));
}

const PERSONAL_REFERENCE = /\b(i|i'm|im|ive|my|me|mine|we|our|myself)\b/i;
const MEDICAL_TERMS = [
    /\bsymptom/i,
    /\bdiagnos/i,
    /\btreat(ment)?\b/i,
    /\bmedication\b/i,
    /\bmedicine\b/i,
    /\bdose|dosage\b/i,
    /\bchest pain\b/i,
    /\bshortness of breath\b/i,
    /\bfever\b/i,
    /\bcough\b/i,
    /\brain\b/i,
    /\brash\b/i,
    /\binfection\b/i,
    /\bblood pressure\b/i,
    /\bcholesterol\b/i,
    /\bdiabetes\b/i,
    /\basthma\b/i,
    /\bdepress(ion)?\b/i,
    /\banxiety\b/i,
    /\bpregnan/i,
    /\bemergency\b/i,
];
const ADVICE_PATTERNS = [
    /\bwhat should i do\b/i,
    /\bshould i\b/i,
    /\bdo i need\b/i,
    /\bis this serious\b/i,
    /\bcan i take\b/i,
    /\bwhich medication\b/i,
    /\bhow much should i\b/i,
];
const PHI_PATTERNS = [
    /\bdate of birth\b/i,
    /\bdob\b/i,
    /\bsocial security\b/i,
    /\bssn\b/i,
    /\bmedical record\b/i,
    /\bmrn\b/i,
    /\binsurance id\b/i,
    /\bmember id\b/i,
];
const SERVICE_QUESTION_PATTERNS = [
    /\b(can|do|does)\s+(you|present health)\s+(prescribe|order|manage|offer|provide)\b/i,
    /\bwhat does (present health|dpc) cover\b/i,
];

export function containsMedicalOrPhiRequest(input: string) {
    const text = String(input || "").trim();
    if (!text) return false;

    const hasPersonalContext = PERSONAL_REFERENCE.test(text);
    const hasMedicalTerms = hasAny(MEDICAL_TERMS, text);
    const asksAdvice = hasAny(ADVICE_PATTERNS, text);
    const containsPhi = hasAny(PHI_PATTERNS, text);
    const isServiceQuestion = hasAny(SERVICE_QUESTION_PATTERNS, text);

    if (containsPhi) return true;
    if (isServiceQuestion && !asksAdvice && !hasPersonalContext) return false;
    if (asksAdvice) return true;
    if (hasPersonalContext && hasMedicalTerms) return true;
    return false;
}

const PROSPECTIVE_PATTERNS = [
    /\bjoin\b/i,
    /\bsign\s?up\b/i,
    /\benroll/i,
    /\bmembership\b/i,
    /\bpricing\b/i,
    /\bprice\b/i,
    /\bcost\b/i,
    /\bmonthly\b/i,
    /\bavailable\b/i,
    /\bstate\b/i,
    /\bconsult(ation)?\b/i,
    /\bbook\b/i,
    /\bappointment\b/i,
    /\bstart\b/i,
];

export function detectProspectiveIntent(input: string) {
    const text = String(input || "").trim();
    if (!text) return false;
    return hasAny(PROSPECTIVE_PATTERNS, text);
}

export function normalizeEmail(value: string) {
    return String(value || "").trim().toLowerCase();
}
