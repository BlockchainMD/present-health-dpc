import Parser from 'rss-parser';

const parser = new Parser();

export interface Trend {
    title: string;
    link: string;
    pubDate: string;
    source: string;
}

export async function fetchTrends(): Promise<Trend[]> {
    const trends: Trend[] = [];

    try {
        // 1. Google Trends (Health) - US
        // Geo=US, Category=45 (Health)
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

            // Take top 2 from each query
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
        // Return mock data if feeds fail (e.g. rate limiting)
        return [
            {
                title: "Why Direct Primary Care is Booming in 2026",
                link: `https://example.com/dpc-boom?t=${Date.now()}`,
                pubDate: new Date().toISOString(),
                source: "Mock Data (Fallback)"
            },
            {
                title: "New HSA Limits for 2026 Explained",
                link: `https://example.com/hsa-2026?t=${Date.now()}`,
                pubDate: new Date().toISOString(),
                source: "Mock Data (Fallback)"
            }
        ];
    }

    return trends;
}
