import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        tests: []
    };

    // Test 1: Database connection
    try {
        await prisma.$queryRaw`SELECT 1`;
        diagnostics.tests.push({ name: 'Database Connection', status: 'PASS' });
    } catch (error: any) {
        diagnostics.tests.push({ name: 'Database Connection', status: 'FAIL', error: error.message });
        return NextResponse.json(diagnostics);
    }

    // Test 2: Check Campaign table exists
    try {
        const result: any = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "Campaign"');
        diagnostics.tests.push({ name: 'Campaign Table Exists', status: 'PASS', count: result?.[0]?.count });
    } catch (error: any) {
        diagnostics.tests.push({ name: 'Campaign Table Exists', status: 'FAIL', error: error.message });
    }

    // Test 3: Check Campaign schema
    try {
        const columns: any = await prisma.$queryRawUnsafe(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'Campaign'
            ORDER BY ordinal_position
        `);
        diagnostics.tests.push({
            name: 'Campaign Schema',
            status: 'PASS',
            columns: columns.map((c: any) => `${c.column_name} (${c.data_type})`)
        });
    } catch (error: any) {
        diagnostics.tests.push({ name: 'Campaign Schema', status: 'FAIL', error: error.message });
    }

    // Test 4: Try inserting a test campaign
    const testSlug = `test-diagnostic-${Date.now()}`;
    try {
        const campaign = await prisma.campaign.create({
            data: {
                slug: testSlug,
                persona: 'Test Persona',
                intent: 'Test Intent',
                seedKeywords: ['test'],
                benefits: ['test'],
                proofPoints: ['test'],
                disclaimers: ['test'],
                landingSlug: 'test-landing',
                budgetDaily: 50,
                targetCpa: 30,
                geo: 'US',
                tone: 'Professional',
                status: 'DRAFT'
            }
        });
        diagnostics.tests.push({ name: 'Campaign Insert', status: 'PASS', id: campaign.id });

        // Clean up: delete the test campaign
        await prisma.campaign.delete({ where: { id: campaign.id } });
        diagnostics.tests.push({ name: 'Campaign Delete (cleanup)', status: 'PASS' });
    } catch (error: any) {
        diagnostics.tests.push({
            name: 'Campaign Insert',
            status: 'FAIL',
            error: error.message,
            code: error.code,
            meta: error.meta
        });
    }

    return NextResponse.json(diagnostics);
}
