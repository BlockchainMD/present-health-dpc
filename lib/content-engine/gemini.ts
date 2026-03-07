import { VertexAI } from '@google-cloud/vertexai';

const DEFAULT_MODEL = 'gemini-2.0-flash';
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
                maxOutputTokens: 8192,
            }
        });

        const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) {
            console.error('Gemini returned empty response');
            return null;
        }
        return JSON.parse(text) as T;
    } catch (error) {
        console.error('Gemini JSON generation failed', error);
        return null;
    }
}
