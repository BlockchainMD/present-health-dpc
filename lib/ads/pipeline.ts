
import { prisma } from '@/lib/prisma';

export type PipelineStep = 'TREND_SIGNAL' | 'INLET_CANDIDATE' | 'CAMPAIGN_SPEC' | 'AD_PLAN' | 'LANDING_PAGE_SPEC' | 'COMPLIANCE_REPORT';

/**
 * PipelineManager handles deterministic storage and retrieval of ad engine artifacts.
 * This ensures that any step can be re-run without re-calling LLMs or external APIs 
 * if a valid artifact already exists.
 */
export const PipelineManager = {
    /**
     * Stores an artifact in the CampaignRun
     */
    async saveArtifact(runId: string, step: PipelineStep, data: any) {
        const run = await prisma.campaignRun.findUnique({ where: { id: runId } });
        if (!run) throw new Error(`CampaignRun ${runId} not found`);

        const artifacts = (run.artifacts as any) || {};
        artifacts[step] = {
            data,
            timestamp: new Date().toISOString(),
            version: (artifacts[step]?.version || 0) + 1
        };

        return await prisma.campaignRun.update({
            where: { id: runId },
            data: { artifacts }
        });
    },

    /**
     * Retrieves an artifact for a specific step
     */
    async getArtifact(runId: string, step: PipelineStep) {
        const run = await prisma.campaignRun.findUnique({ where: { id: runId } });
        if (!run || !run.artifacts) return null;

        const artifacts = run.artifacts as any;
        return artifacts[step] || null;
    },

    /**
     * Executes a pipeline step deterministically.
     * If an artifact exists and force=false, it returns the cached version.
     */
    async runStep<T>(runId: string, step: PipelineStep, generator: () => Promise<T>, force: boolean = false): Promise<T> {
        if (!force) {
            const cached = await this.getArtifact(runId, step);
            if (cached) {
                console.log(`[Pipeline] Using cached artifact for ${step} (${runId})`);
                return cached.data as T;
            }
        }

        console.log(`[Pipeline] Executing generator for ${step} (${runId})...`);
        const result = await generator();
        await this.saveArtifact(runId, step, result);
        return result;
    }
};
