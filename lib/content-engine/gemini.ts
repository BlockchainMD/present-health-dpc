import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const DRAFT_MODEL = 'gemini-3-flash-preview';
const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'present-health-dpc-2025';
const GCP_LOCATION = 'global';

function getClient() {
    // The SDK auto-detects GOOGLE_API_KEY / GEMINI_API_KEY from env and uses
    // them for "express mode" auth, which conflicts with global-endpoint ADC.
    // Temporarily hide them so the SDK uses ADC instead.
    const saved = { g: process.env.GOOGLE_API_KEY, k: process.env.GEMINI_API_KEY };
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const client = new GoogleGenAI({
        vertexai: true,
        project: GCP_PROJECT,
        location: GCP_LOCATION,
    });
    if (saved.g) process.env.GOOGLE_API_KEY = saved.g;
    if (saved.k) process.env.GEMINI_API_KEY = saved.k;
    return client;
}

export type GeminiModelTier = 'fast' | 'quality';

export async function generateJson<T>(
    prompt: string,
    temperature: number,
    tier: GeminiModelTier = 'fast'
): Promise<T | null> {
    const modelId = tier === 'quality'
        ? (process.env.GEMINI_QUALITY_MODEL || DRAFT_MODEL)
        : (process.env.GEMINI_MODEL || DEFAULT_MODEL);

    const client = getClient();

    try {
        const response = await client.models.generateContent({
            model: modelId,
            contents: prompt,
            config: {
                temperature,
                responseMimeType: 'application/json',
                maxOutputTokens: 65536,
            }
        });

        const text = response.text || '';
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
