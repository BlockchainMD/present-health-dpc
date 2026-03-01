import crypto from 'crypto';

const ANGLES = [
    'Myth vs Fact',
    'Decision Guide',
    'Beginner Starter Kit',
    'What the Evidence Says',
    'Lifestyle Experiment',
    'Workplace Health',
    'Time-Saving Playbook',
    'Care Navigation',
    'Seasonal Lens',
    'Hidden Causes',
    'Checklist',
    'Trade-offs & Choices'
];

const INTENTS = [
    'Curious',
    'Problem-aware',
    'Comparison',
    'Prevention',
    'Self-improvement',
    'Care-navigation'
];

const CLUSTERS: Array<{ name: string; keywords: string[] }> = [
    { name: 'sleep', keywords: ['sleep', 'insomnia', 'tired', 'fatigue', 'snore'] },
    { name: 'metabolic', keywords: ['glucose', 'diabetes', 'a1c', 'metabolic', 'insulin'] },
    { name: 'heart', keywords: ['heart', 'cardio', 'blood pressure', 'hypertension', 'cholesterol'] },
    { name: 'respiratory', keywords: ['asthma', 'breathing', 'lung', 'cough'] },
    { name: 'digestive', keywords: ['gut', 'digest', 'ibs', 'reflux', 'stomach'] },
    { name: 'mental-health', keywords: ['anxiety', 'stress', 'burnout', 'depression'] },
    { name: 'musculoskeletal', keywords: ['back pain', 'joint', 'knee', 'shoulder', 'arthritis'] },
    { name: 'brain', keywords: ['brain', 'focus', 'memory', 'cognition'] },
    { name: 'energy', keywords: ['energy', 'fatigue', 'tired'] },
    { name: 'nutrition', keywords: ['diet', 'nutrition', 'protein', 'fiber', 'micronutrients'] },
    { name: 'fitness', keywords: ['exercise', 'strength', 'cardio', 'mobility'] },
    { name: 'women-health', keywords: ['women', 'menopause', 'period', 'pms'] },
    { name: 'men-health', keywords: ['men', 'testosterone', 'prostate'] },
    { name: 'kids', keywords: ['child', 'kids', 'teen', 'pediatric'] },
    { name: 'longevity', keywords: ['longevity', 'aging', 'lifespan', 'healthspan'] },
    { name: 'preventive', keywords: ['screening', 'prevent', 'risk', 'checkup'] },
    { name: 'care-navigation', keywords: ['primary care', 'doctor', 'care', 'telehealth', 'clinic'] },
    { name: 'workplace', keywords: ['work', 'remote', 'office', 'desk'] },
    { name: 'travel', keywords: ['travel', 'jet lag'] },
    { name: 'skin', keywords: ['skin', 'rash', 'acne', 'eczema'] },
    { name: 'immune', keywords: ['immune', 'allergy', 'vaccin', 'flu'] }
];

const CLUSTER_RISK_PRIORITY = [
    'heart',
    'brain',
    'respiratory',
    'kids',
    'mental-health',
    'women-health',
    'metabolic',
    'immune',
    'digestive',
    'skin',
    'musculoskeletal',
    'men-health',
    'sleep',
    'energy',
    'nutrition',
    'fitness',
    'preventive',
    'longevity',
    'travel',
    'workplace',
    'care-navigation',
    'general'
];
const CLUSTER_PRIORITY_MAP = new Map(CLUSTER_RISK_PRIORITY.map((name, index) => [name, index]));

const HIGH_RISK_KEYWORDS = [
    'cancer',
    'suicide',
    'pregnancy',
    'infant',
    'overdose',
    'stroke',
    'heart attack',
    'sepsis',
    'drug',
    'medication',
    'prescription'
];

const MEDIUM_RISK_KEYWORDS = [
    'diabetes',
    'hypertension',
    'asthma',
    'depression',
    'anxiety',
    'ptsd',
    'chronic'
];

export function pickAngle(seed: string): string {
    return pickFromSeed(ANGLES, seed + ':angle');
}

export function pickIntent(seed: string): string {
    return pickFromSeed(INTENTS, seed + ':intent');
}

export function classifyCluster(title: string): string {
    return classifyClusters(title).primary;
}

export function classifyClusters(title: string): { primary: string; secondary: string[] } {
    const lower = title.toLowerCase();
    const matches = CLUSTERS
        .filter(cluster => cluster.keywords.some(k => lower.includes(k)))
        .map(cluster => cluster.name);

    if (matches.length === 0) {
        return { primary: 'general', secondary: [] };
    }

    const sorted = Array.from(new Set(matches)).sort((a, b) => {
        const aRank = CLUSTER_PRIORITY_MAP.get(a) ?? CLUSTER_PRIORITY_MAP.get('general') ?? 999;
        const bRank = CLUSTER_PRIORITY_MAP.get(b) ?? CLUSTER_PRIORITY_MAP.get('general') ?? 999;
        return aRank - bRank;
    });

    const [primary, ...secondary] = sorted;
    return { primary, secondary };
}

export function estimateRisk(title: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    const lower = title.toLowerCase();
    if (HIGH_RISK_KEYWORDS.some(k => lower.includes(k))) return 'HIGH';
    if (MEDIUM_RISK_KEYWORDS.some(k => lower.includes(k))) return 'MEDIUM';
    return 'LOW';
}

export function normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, ' ').trim();
}

export function cleanTopicTitle(title: string): string {
    if (!title) return '';
    let cleaned = title.trim();
    cleaned = cleaned.replace(/^[“”"']+|[“”"']+$/g, '');
    cleaned = cleaned.replace(/\s+with\s+Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g, '');
    cleaned = cleaned.replace(/\s*[-–—|]\s*[^-–—|]{2,}$/g, '');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    return cleaned || title;
}

export function slugify(input: string): string {
    const slug = input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    if (slug.length <= 80) return slug;
    // Truncate at a word boundary to avoid mid-word cuts
    const truncated = slug.slice(0, 80);
    const lastDash = truncated.lastIndexOf('-');
    return lastDash > 40 ? truncated.slice(0, lastDash) : truncated;
}

function pickFromSeed<T>(items: T[], seed: string): T {
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    const num = parseInt(hash.slice(0, 8), 16);
    return items[num % items.length];
}
