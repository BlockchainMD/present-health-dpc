import Parser from 'rss-parser';

const parser = new Parser();

export interface Trend {
    title: string;
    link: string;
    pubDate: string;
    source: string;
}

// Topics relevant to Direct Primary Care
const DPC_TOPICS = [
    "Direct Primary Care Benefits",
    "How to Choose a Primary Care Doctor",
    "Preventative Health Screenings",
    "Managing Chronic Conditions",
    "Understanding HSA and FSA Accounts",
    "Telehealth vs In-Person Visits",
    "Annual Physical Exam Checklist",
    "Mental Health in Primary Care",
    "Workplace Wellness Programs",
    "Healthcare Costs in America",
    "Medicare vs Direct Primary Care",
    "Family Medicine Best Practices",
    "Health Insurance Alternatives",
    "Patient-Doctor Relationship Tips",
    "Lifestyle Medicine Trends"
];

export async function fetchTrends(): Promise<Trend[]> {
    const trends: Trend[] = [];

    try {
        // 1. Google Trends (Health) - US
        const trendsFeed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US');

        trendsFeed.items.forEach(item => {
            trends.push({
                title: item.title || 'Unknown Trend',
                link: item.link || '',
                pubDate: item.pubDate || new Date().toISOString(),
                source: 'Google Trends'
            });
        });

        // 2. Google News - Specific Queries
        const queries = ['Direct Primary Care', 'Health Savings Account', 'Preventative Medicine'];

        for (const query of queries) {
            const encodedQuery = encodeURIComponent(query);
            const newsFeed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`);

            newsFeed.items.slice(0, 2).forEach(item => {
                trends.push({
                    title: item.title || 'Unknown News',
                    link: item.link || '',
                    pubDate: item.pubDate || new Date().toISOString(),
                    source: `Google News (${query})`
                });
            });
        }

    } catch (error) {
        console.error('Error fetching trends:', error);
        // Return diverse mock data if feeds fail
        const shuffled = DPC_TOPICS.sort(() => Math.random() - 0.5);
        const selectedTopics = shuffled.slice(0, 5);

        return selectedTopics.map((topic, index) => ({
            title: topic,
            link: `https://presenthealth.com/topics/${encodeURIComponent(topic.toLowerCase().replace(/\s+/g, '-'))}?id=${Date.now()}-${index}`,
            pubDate: new Date().toISOString(),
            source: "Present Health Topics"
        }));
    }

    return trends;
}
