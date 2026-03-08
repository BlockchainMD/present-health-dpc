import { VertexAI } from '@google-cloud/vertexai';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DRAFT_MODEL = 'gemini-2.5-pro';
const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'present-health-dpc-2025';
const GCP_LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';

function getVertexClient() {
    return new VertexAI({ project: GCP_PROJECT, location: GCP_LOCATION });
}

export type GeminiModelTier = 'fast' | 'quality';

export async function generateJson<T>(
    prompt: string,
    temperature: number,
    tier: GeminiModelTier = 'fast'
): Promise<T | null> {
    const client = getVertexClient();
    const modelId = tier === 'quality'
        ? (process.env.GEMINI_QUALITY_MODEL || DRAFT_MODEL)
        : (process.env.GEMINI_MODEL || DEFAULT_MODEL);

    const model = client.getGenerativeModel({ model: modelId });

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature,
                responseMimeType: 'application/json',
                maxOutputTokens: 65536,
            }
        });

        const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) {
            console.error(`Gemini (${modelId}) returned empty response`);
            return null;
        }

        try {
            return JSON.parse(text) as T;
        } catch {
            const repaired = repairJson(text);
            if (repaired) {
                console.warn(`Gemini (${modelId}) JSON required repair`);
                return repaired as T;
            }
            console.error(`Gemini (${modelId}) JSON parse failed after repair attempt`);
            return null;
        }
    } catch (error) {
        console.error(`Gemini (${modelId}) JSON generation failed`, error);
        return null;
    }
}

function repairJson(text: string): unknown | null {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    try { return JSON.parse(cleaned); } catch {}

    if (cleaned.startsWith('{')) {
        for (let i = cleaned.length; i > 0; i--) {
            const ch = cleaned[i - 1];
            if (ch === ',' || ch === '"' || ch === ' ' || ch === '\n' || ch === '\\') continue;
            const truncated = cleaned.slice(0, i);

            let braces = 0;
            let brackets = 0;
            let inString = false;
            let escape = false;
            for (const c of truncated) {
                if (escape) { escape = false; continue; }
                if (c === '\\' && inString) { escape = true; continue; }
                if (c === '"') { inString = !inString; continue; }
                if (inString) continue;
                if (c === '{') braces++;
                if (c === '}') braces--;
                if (c === '[') brackets++;
                if (c === ']') brackets--;
            }

            let suffix = '';
            if (inString) suffix += '"';
            for (let b = 0; b < brackets; b++) suffix += ']';
            for (let b = 0; b < braces; b++) suffix += '}';

            try {
                return JSON.parse(truncated + suffix);
            } catch {
                continue;
            }
        }
    }

    return null;
}
