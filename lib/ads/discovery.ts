import { fetchTrends, Trend } from '../trends';
import OpenAI from 'openai';
import { validateContent } from './compliance';
import { InletCandidate } from './types';

export async function discoverInlets(): Promise<InletCandidate[]> {
    const trends = await fetchTrends();
    if (!trends || trends.length === 0) return [];

    if (!process.env.OPENAI_API_KEY) {
        console.warn("Missing OPENAI_API_KEY for Discovery. Returning mock inlets.");
        return trends.slice(0, 3).map(t => ({
            trendId: t.title,
            strategy: 'EDUCATIONAL',
            persona: "Health-conscious searchers",
            problem: "Looking for reliable answers about " + t.title,
            educationalAngle: "How DPC provides the time to address " + t.title,
            hook: "Unrushed care for " + t.title,
            suggestedKeywords: [t.title.toLowerCase(), "doctor for " + t.title.toLowerCase()],
            score: {
                total: 80,
                trendGrowth: 15,
                estimatedVolume: 15,
                competitionLow: 15,
                personaFit: 15,
                complianceSafety: 20
            },
            justification: "Mock score for testing."
        }));
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Process top 5 trends
    const topTrends = trends.slice(0, 5);
    const inlets: InletCandidate[] = [];

    for (const trend of topTrends) {
        try {
            const prompt = `
            You are a healthcare marketing strategist for Present Health, a Virtual Direct Primary Care (DPC) practice.
            Analyze this trending health topic: "${trend.title}"
            
            Find a "Hidden Gem" inlet where we can provide value.
            Target "Problem-Aware" keywords (what people search when they have a symptom or question).
            
            Strategy: EDUCATIONAL
            
            Return JSON only:
            {
                "persona": "specific type of person worried about this",
                "problem": "the core underlying anxiety",
                "educationalAngle": "The medical briefing hook",
                "hook": "The ad click hook (curiosity driven)",
                "suggestedKeywords": ["..."],
                "score": {
                    "trendGrowth": 0-20,
                    "estimatedVolume": 0-20,
                    "competitionLow": 0-20,
                    "personaFit": 0-20,
                    "complianceSafety": 0-20
                },
                "justification": "Breakdown of the score and why this fits the Virtual DPC offer"
            }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" },
                temperature: 0.7
            });

            const text = response.choices[0]?.message?.content;
            if (text) {
                const json = JSON.parse(text);

                // Cleanup keywords
                const cleanKeywords = (json.suggestedKeywords || [])
                    .map((k: string) => k.toLowerCase().trim())
                    .filter((k: string) => validateContent(k).status === 'PASS');

                // Hard Gates
                const totalScore = json.score.trendGrowth + json.score.estimatedVolume +
                    json.score.competitionLow + json.score.personaFit +
                    json.score.complianceSafety;

                if (totalScore < 60) {
                    console.log(`Skipping ${trend.title}: Score too low (${totalScore})`);
                    continue;
                }

                inlets.push({
                    trendId: trend.title,
                    strategy: 'EDUCATIONAL',
                    persona: json.persona,
                    problem: json.problem,
                    educationalAngle: json.educationalAngle,
                    hook: json.hook,
                    suggestedKeywords: cleanKeywords,
                    score: {
                        ...json.score,
                        total: totalScore
                    },
                    justification: json.justification
                });
            }
        } catch (e) {
            console.error(`Failed to analyze trend: ${trend.title}`, e);
        }
    }

    return inlets;
}
