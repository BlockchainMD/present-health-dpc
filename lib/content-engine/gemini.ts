import { VertexAI } from '@google-cloud/vertexai';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const GCP_PROJECT = process.env.GOOGLE_CLOUD_PROJECT || 'present-health-dpc-2025';
const GCP_LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';

function getVertexClient() {
    return new VertexAI({ project: GCP_PROJECT, location: GCP_LOCATION });
}

export async function generateJson<T>(prompt: string, temperature: number): Promise<T | null> {
    const client = getVertexClient();
    const model = client.getGenerativeModel({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
    });

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
            console.error('Gemini returned empty response');
            return null;
        }

        try {
            return JSON.parse(text) as T;
        } catch {
            // Attempt to repair truncated or malformed JSON
            const repaired = repairJson(text);
            if (repaired) {
                console.warn('Gemini JSON required repair');
                return repaired as T;
            }
            console.error('Gemini JSON parse failed after repair attempt');
            return null;
        }
    } catch (error) {
        console.error('Gemini JSON generation failed', error);
        return null;
    }
}

function repairJson(text: string): unknown | null {
    // Strip markdown code fences if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Try parsing the cleaned text first
    try { return JSON.parse(cleaned); } catch {}

    // If it starts with { but is truncated, try to close it
    if (cleaned.startsWith('{')) {
        // Find the last complete key-value pair
        // Try progressively closing the JSON
        for (let i = cleaned.length; i > 0; i--) {
            const ch = cleaned[i - 1];
            if (ch === ',' || ch === '"' || ch === ' ' || ch === '\n' || ch === '\\') continue;
            const truncated = cleaned.slice(0, i);

            // Count open braces/brackets
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

            // If we're inside a string, close it
            let suffix = '';
            if (inString) suffix += '"';
            // Close any open brackets and braces
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
