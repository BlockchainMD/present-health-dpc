import { fetchTrends } from '../lib/trends';

async function test() {
    console.log('Fetching trends...');
    const trends = await fetchTrends();
    console.log(`Found ${trends.length} trends.`);

    if (trends.length > 0) {
        console.log('Top 3 trends:');
        trends.slice(0, 3).forEach((t, i) => {
            console.log(`${i + 1}. ${t.title} (${t.source})`);
        });
    }
}

test().catch(console.error);
