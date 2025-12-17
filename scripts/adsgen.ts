import fs from 'fs';
import path from 'path';
import { validateCampaignSpec } from '../lib/ads/compliance';
import { generateKeywords } from '../lib/ads/keywords';
import { generateAdAssets } from '../lib/ads/google-ads';
import { prisma } from '../lib/prisma';

// Simple CLI argument parser
const args = process.argv.slice(2);
const command = args[0];
const specFlagIndex = args.indexOf('--spec');
const specPath = specFlagIndex > -1 ? args[specFlagIndex + 1] : null;

async function main() {
    if (!command) {
        console.log(`
Usage:
  npx tsx scripts/adsgen.ts validate --spec <path-to-json>
  npx tsx scripts/adsgen.ts generate --spec <path-to-json>
    `);
        process.exit(0);
    }

    if (!specPath) {
        console.error('Error: --spec <path> is required');
        process.exit(1);
    }

    const absolutePath = path.resolve(process.cwd(), specPath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`Error: File not found at ${absolutePath}`);
        process.exit(1);
    }

    const specContent = fs.readFileSync(absolutePath, 'utf-8');
    let spec;
    try {
        spec = JSON.parse(specContent);
    } catch (e) {
        console.error('Error: Failed to parse JSON spec');
        process.exit(1);
    }

    if (command === 'validate') {
        console.log(`Validating spec: ${spec.slug || 'Unknown'}...`);
        const result = validateCampaignSpec(spec);
        if (result.status === 'PASS') {
            console.log('✅ Compliance Check PASSED');
        } else {
            console.error('❌ Compliance Check FAILED');
            result.reasons.forEach(r => console.error(`   - ${r}`));
            process.exit(1);
        }
    }
    else if (command === 'generate') {
        console.log(`Generating assets for: ${spec.slug}...`);

        // 1. Validate first
        const compliance = validateCampaignSpec(spec);
        if (compliance.status === 'FAIL') {
            console.error('❌ Compliance Check FAILED. Aborting generation.');
            compliance.reasons.forEach(r => console.error(`   - ${r}`));
            process.exit(1);
        }

        // 2. Generate Keywords
        console.log('\n--- Generated Keywords ---');
        const keywords = generateKeywords(spec.seedKeywords || []);
        keywords.forEach(k => console.log(`[${k.matchType}] ${k.keyword}`));

        // 3. Generate Ads
        console.log('\n--- Generated Ad Assets ---');
        const ads = generateAdAssets(spec);
        console.log('Headlines:');
        ads.headlines.forEach(h => console.log(`  - ${h}`));
        console.log('Descriptions:');
        ads.descriptions.forEach(d => console.log(`  - ${d}`));

        // 4. DB Sync (Optional for CLI, but good for testing)
        // We'll just print that we would sync here to keep CLI lightweight/safe
        console.log('\n✅ Assets generated successfully (Dry Run).');
        console.log('To persist to DB, use the Admin UI or implement DB sync in CLI.');
    }
    else {
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
}

main().catch(console.error);
