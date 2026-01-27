import Parser from 'rss-parser';
import { TopicSignal } from './types';
import { normalizeTitle } from './taxonomy';

const parser = new Parser();

const NEWS_QUERIES = [
    'primary care',
    'preventive health',
    'sleep health',
    'metabolic health',
    'mental health',
    'longevity science',
    'cardiovascular health',
    'gut health',
    'healthspan',
    'exercise science'
];

const PUBMED_QUERIES = [
    'primary care prevention',
    'sleep quality adults',
    'exercise adherence',
    'metabolic syndrome lifestyle',
    'hypertension lifestyle',
    'longevity biomarkers',
    'circadian rhythm health'
];

const TRIALS_QUERIES = [
    'sleep',
    'longevity',
    'metabolic',
    'blood pressure',
    'exercise',
    'mindfulness'
];

const CURATED_TOPICS = [
    'Why do I wake up tired after 8 hours?',
    'How to lower blood pressure without extreme diets',
    'The real impact of walking on longevity',
    'What a high-protein breakfast changes in your day',
    'Is sitting the new smoking? A practical guide',
    'How stress shows up in your body',
    'The 3 most common causes of chronic fatigue',
    'What does "healthy gut" actually mean?',
    'How to know if you need a sleep study',
    'The difference between soreness and injury',
    'What to ask your doctor at an annual checkup',
    'Simple ways to improve recovery after workouts',
    'How to build a sustainable exercise habit',
    'Should you track your heart rate every day?',
    'What is metabolic flexibility?',
    'How alcohol affects sleep quality',
    'Why your hands get cold easily',
    'How to reduce afternoon energy crashes',
    'The most overlooked nutrient for office workers',
    'How to read a basic blood test panel'
];

export async function fetchTopicSignals(options?: {
    sources?: {
        trends?: boolean;
        news?: boolean;
        pubmed?: boolean;
        trials?: boolean;
        nih?: boolean;
        cdc?: boolean;
        curated?: boolean;
    };
    limit?: number;
}): Promise<TopicSignal[]> {
    const sources = options?.sources || {};
    const limit = options?.limit || 50;

    const includeTrends = sources.trends !== false;
    const includeNews = sources.news !== false;
    const includePubmed = sources.pubmed !== false;
    const includeTrials = sources.trials !== false;
    const includeNih = sources.nih !== false;
    const includeCdc = sources.cdc === true;
    const includeCurated = sources.curated !== false;

    const all: TopicSignal[] = [];

    if (includeTrends) {
        all.push(...await fetchGoogleTrends());
    }
    if (includeNews) {
        all.push(...await fetchGoogleNews(NEWS_QUERIES));
    }
    if (includePubmed) {
        all.push(...await fetchPubMed(PUBMED_QUERIES));
    }
    if (includeTrials) {
        all.push(...await fetchClinicalTrials(TRIALS_QUERIES));
    }
    if (includeNih) {
        all.push(...await fetchNihNews());
    }
    if (includeCdc) {
        all.push(...await fetchCdcNews());
    }
    if (includeCurated) {
        all.push(...fetchCuratedTopics());
    }

    const seen = new Set<string>();
    const deduped: TopicSignal[] = [];
    for (const item of all) {
        const key = normalizeTitle(item.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
        if (deduped.length >= limit) break;
    }

    return deduped;
}

async function fetchGoogleTrends(): Promise<TopicSignal[]> {
    try {
        const feed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US');
        return feed.items.map(item => ({
            title: item.title || 'Untitled trend',
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            source: 'Google Trends',
            kind: 'trend'
        }));
    } catch (error) {
        console.warn('Trends fetch failed', error);
        return [];
    }
}

async function fetchGoogleNews(queries: string[]): Promise<TopicSignal[]> {
    const results: TopicSignal[] = [];

    for (const query of queries) {
        try {
            const encodedQuery = encodeURIComponent(query);
            const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`);
            feed.items.slice(0, 3).forEach(item => {
                results.push({
                    title: item.title || 'Untitled news',
                    url: item.link || '',
                    publishedAt: item.pubDate || new Date().toISOString(),
                    source: `Google News (${query})`,
                    kind: 'news'
                });
            });
        } catch (error) {
            console.warn('News fetch failed for', query, error);
        }
    }

    return results;
}

async function fetchPubMed(queries: string[]): Promise<TopicSignal[]> {
    const results: TopicSignal[] = [];

    for (const query of queries) {
        try {
            const encodedQuery = encodeURIComponent(query);
            const feed = await parser.parseURL(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodedQuery}&format=rss`);
            feed.items.slice(0, 3).forEach(item => {
                results.push({
                    title: item.title || 'Untitled study',
                    url: item.link || '',
                    publishedAt: item.pubDate || new Date().toISOString(),
                    source: `PubMed (${query})`,
                    kind: 'research'
                });
            });
        } catch (error) {
            console.warn('PubMed fetch failed for', query, error);
        }
    }

    return results;
}

async function fetchClinicalTrials(queries: string[]): Promise<TopicSignal[]> {
    const results: TopicSignal[] = [];

    for (const query of queries) {
        try {
            const encoded = encodeURIComponent(query);
            const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encoded}&pageSize=3&countTotal=false`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            const studies = data?.studies || [];
            for (const study of studies) {
                const title = study?.protocolSection?.identificationModule?.briefTitle;
                const nctId = study?.protocolSection?.identificationModule?.nctId;
                if (!title) continue;
                results.push({
                    title: title,
                    url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : '',
                    publishedAt: new Date().toISOString(),
                    source: `ClinicalTrials.gov (${query})`,
                    kind: 'trial'
                });
            }
        } catch (error) {
            console.warn('ClinicalTrials fetch failed for', query, error);
        }
    }

    return results;
}

async function fetchNihNews(): Promise<TopicSignal[]> {
    try {
        const feed = await parser.parseURL('https://www.nih.gov/news-events/news-releases/rss.xml');
        return feed.items.slice(0, 5).map(item => ({
            title: item.title || 'NIH update',
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            source: 'NIH News Releases',
            kind: 'news'
        }));
    } catch (error) {
        console.warn('NIH news fetch failed', error);
        return [];
    }
}

async function fetchCdcNews(): Promise<TopicSignal[]> {
    try {
        const feed = await parser.parseURL('https://tools.cdc.gov/api/v2/resources/media/403372.rss');
        return feed.items.slice(0, 5).map(item => ({
            title: item.title || 'CDC update',
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            source: 'CDC Newsroom',
            kind: 'news'
        }));
    } catch (error) {
        console.warn('CDC news fetch failed', error);
        return [];
    }
}

function fetchCuratedTopics(): TopicSignal[] {
    return CURATED_TOPICS.map(topic => ({
        title: topic,
        url: '',
        publishedAt: new Date().toISOString(),
        source: 'Curated',
        kind: 'curated'
    }));
}
