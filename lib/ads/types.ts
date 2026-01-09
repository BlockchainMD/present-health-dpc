
/**
 * PRESENT HEALTH AD ENGINE: ARTIFACT CONTRACTS (v1)
 * 
 * Each interface defines a deterministic checkpoint in the pipeline.
 */

// 1. TrendSignal: Pure external signal
export interface TrendSignal {
    id: string;
    version: number;
    timestamp: string;
    source: 'GOOGLE_TRENDS' | 'GOOGLE_NEWS' | 'MANUAL';
    title: string;
    url?: string;
}

// 2. InletCandidate: AI interpretation of a trend
export interface InletCandidate {
    trendId: string;
    strategy: 'TRANSACTIONAL' | 'EDUCATIONAL';
    persona: string;
    problem: string;
    educationalAngle?: string;
    hook: string;
    suggestedKeywords: string[];
    // Scoring & Gating
    score: {
        total: number; // 0-100
        trendGrowth: number; // 0-20
        estimatedVolume: number; // 0-20
        competitionLow: number; // 0-20 (Higher = less competition)
        personaFit: number; // 0-20
        complianceSafety: number; // 0-20
    };
    justification: string; // "Why this was chosen"
}

// 3. CampaignSpec: The high-level business blueprint
export interface CampaignSpec {
    slug: string;
    persona: string;
    intent: string;
    seedKeywords: string[];
    strategy: 'TRANSACTIONAL' | 'EDUCATIONAL';
    layoutType: 'CONVERSION' | 'EDUCATIONAL';
    benefits: string[]; // Min 3
    proofPoints: string[]; // Min 2
    disclaimers: string[];
    budgetDaily: number;
    targetCpa: number;
    geo: string;
    tone: string;
}

// 4. AdPlan: Platform-specific distribution assets
export interface AdPlan {
    campaignId: string;
    rsa: {
        headlines: string[]; // 3-15 items
        descriptions: string[]; // 2-4 items
    };
    keywords: {
        text: string;
        matchType: 'BROAD' | 'PHRASE' | 'EXACT';
    }[];
    negativeKeywords: string[];
    finalUrl: string;
}

// 5. LandingPageSpec: Content structure for the LP
export interface LandingPageSpec {
    hero: {
        headline: string;
        subheadline: string;
        cta: string;
    };
    educationalBriefing?: string; // Markdown content, required if EDUCATIONAL
    pricing: {
        headline: string;
        subheadline: string;
        tiers: {
            name: string;
            price: number;
            period: string;
            features: string[];
        }[];
    };
    benefits: string[];
    howItWorks: {
        title: string;
        desc: string;
    }[];
    proof: string[];
    faqs: {
        question: string;
        answer: string;
    }[];
    ctaSection: {
        headline: string;
        subheadline: string;
        buttonText: string;
    };
}

// 6. ComplianceReport: Verification audit
export interface ComplianceReport {
    artifactId: string;
    status: 'PASS' | 'FAIL' | 'WARN';
    checkedAt: string;
    reasons: string[];
    sanitizations: {
        field: string;
        original: string;
        fixed: string;
    }[];
}

// 7. DeploymentRecord: Live platform identifiers
export interface DeploymentRecord {
    platform: 'GOOGLE_ADS';
    externalIds: {
        campaignId?: string;
        adGroupId?: string;
        adId?: string;
    };
    deployedAt: string;
    checksum: string; // Hash of AdPlan + LandingPageSpec
}

// 8. PerformanceSnapshot: Periodic metric capture
export interface PerformanceSnapshot {
    date: string;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    cpc: number;
    ctr: number;
}
