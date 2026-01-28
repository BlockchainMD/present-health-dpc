import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_MODEL = 'gemini-3-flash-preview';

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
}

export async function generateJson<T>(prompt: string, temperature: number): Promise<T | null> {
    const client = getGeminiClient();
    if (!client) return null;

    const model = client.getGenerativeModel({
        model: process.env.GEMINI_MODEL || DEFAULT_MODEL
    });

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature,
                responseMimeType: 'application/json'
            }
        });

        const text = result.response.text() || '';
        return JSON.parse(text) as T;
    } catch (error) {
        console.error('Gemini JSON generation failed', error);
        return null;
    }
}
