export type TopicSignal = {
    title: string;
    url?: string;
    source: string;
    publishedAt?: string;
    kind: 'trend' | 'news' | 'research' | 'guideline' | 'trial' | 'curated';
    tags?: string[];
};

export type Brief = {
    title: string;
    slug: string;
    angle: string;
    audience: string;
    intent: string;
    cluster: string;
    primaryCluster: string;
    secondaryClusters: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    hook?: string;
    primaryQuestion: string;
    secondaryQuestions: string[];
    outline: string[];
    actionSteps: string[];
    safetyNotes: string[];
    keywords: string[];
    metaTitle: string;
    metaDescription: string;
    wordCountTarget: number;
    ctaType: 'MEMBERSHIP' | 'NEWSLETTER' | 'BOOK_CALL';
    allowedSources?: string[];
};

export type InternalLinkSuggestion = {
    label: string;
    url: string;
    type: 'conversion' | 'cluster' | 'cross-cluster';
};

export type Draft = {
    title: string;
    content: string;
    excerpt: string;
    metaTitle: string;
    metaDescription: string;
    qaFlags?: string[];
    internalLinks?: InternalLinkSuggestion[];
};

export type EngineOptions = {
    count?: number;
    mode?: 'BALANCED' | 'TREND' | 'RESEARCH';
    autoPublish?: boolean;
    useFeedback?: boolean;
    reviewLabel?: string;
    reviewType?: 'CLINICAL' | 'EDITORIAL';
    sources?: {
        trends?: boolean;
        news?: boolean;
        pubmed?: boolean;
        trials?: boolean;
        nih?: boolean;
        cdc?: boolean;
        curated?: boolean;
    };
};

export type EngineResult = {
    created: number;
    published: number;
    articles: Array<{ id: string; title: string; slug?: string | null }>;
    warnings?: string[];
};
