export const CLINICAL_TEAM_URL = process.env.CONTENT_ENGINE_CLINICAL_TEAM_URL || '/clinical-team';
export const EDITORIAL_POLICY_URL = process.env.CONTENT_ENGINE_EDITORIAL_POLICY_URL || '/editorial-policy';

export function formatLastUpdated(date = new Date()) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
