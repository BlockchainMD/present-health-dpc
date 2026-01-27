import { runContentEngine } from '../lib/content-engine/engine';

function getArg(name: string, fallback?: string) {
    const prefix = `--${name}=`;
    const match = process.argv.find(arg => arg.startsWith(prefix));
    if (!match) return fallback;
    return match.slice(prefix.length);
}

async function run() {
    const count = Number(getArg('count', '10'));
    const mode = (getArg('mode', 'BALANCED') as 'BALANCED' | 'TREND' | 'RESEARCH');
    const autoPublish = getArg('autoPublish', 'false') === 'true';
    const reviewType = (getArg('reviewType', 'CLINICAL') as 'CLINICAL' | 'EDITORIAL');
    const reviewLabel = getArg('reviewLabel');

    let remaining = Number.isFinite(count) ? count : 10;
    let total = 0;
    let published = 0;

    while (remaining > 0) {
        const batchSize = Math.min(10, remaining);
        const result = await runContentEngine({
            count: batchSize,
            mode,
            autoPublish,
            reviewType,
            reviewLabel
        });

        total += result.created;
        published += result.published;
        remaining -= batchSize;

        console.log(`[content-engine] Batch complete: created ${result.created}, published ${result.published}. Remaining: ${remaining}`);
        if (result.created === 0) break;
    }

    console.log(`[content-engine] Done. Total created: ${total}. Total published: ${published}.`);
}

run().catch((error) => {
    console.error('[content-engine] Failed:', error);
    process.exit(1);
});
