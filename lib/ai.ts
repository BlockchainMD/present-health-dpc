import OpenAI from "openai";

export async function generateArticleContent(topic: string): Promise<{ title: string; content: string }> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn("Missing OPENAI_API_KEY. Returning mock content.");
        return {
            title: `Why ${topic} Matters for Your Health`,
            content: `
# Understanding ${topic}

This is a placeholder article generated because the OPENAI_API_KEY is missing. 

## Key Takeaways
* Point 1 about ${topic}
* Point 2 about ${topic}

## How Present Health Helps
We offer direct access to care that can help you manage this.
      `
        };
    }

    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const prompt = `
Act as an expert health content strategist for Present Health, a **Virtual Direct Primary Care (DPC)** practice.

IMPORTANT CONTEXT ABOUT PRESENT HEALTH:
- Present Health is a 100% VIRTUAL/TELEHEALTH DPC practice, not a traditional in-person clinic.
- Patients get unlimited virtual visits, text/video access to their doctor, and care from anywhere.
- The practice serves patients across multiple states without requiring in-person visits.
- This is ideal for busy professionals, remote workers, travelers, and those in underserved areas.
- The virtual model allows for more accessible, convenient, and affordable primary care.

Write a high-ranking SEO blog post about "${topic}".

Goals:
1. SEO Optimization: Target high-intent keywords related to the topic. Answer "People Also Ask" style questions.
2. Tone: Authoritative, professional, and accessible (Grade 8 reading level). Do NOT use first-person ("I", "me"). Use "Present Health" or "we" when referring to the practice.
3. Structure: Use engaging H2/H3 headings, bullet points, and short paragraphs for readability.
4. Value Proposition: Clearly explain why this topic matters and how the **VIRTUAL** Direct Primary Care model provides a superior solution compared to traditional fee-for-service care.
5. Highlight Virtual Benefits: Emphasize convenience, accessibility, care from anywhere, no travel time, instant messaging with your doctor, etc.
6. Call to Action: End with a compelling reason to join Present Health's virtual practice.

Format:
- Return ONLY a JSON object.
- JSON format: { "title": "SEO-Optimized, Catchy Title", "content": "Markdown content..." }
- Do not include markdown code blocks around the JSON.
`;

        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: "You are a health content writer. Always respond with valid JSON only." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
        });

        const text = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(text);

        return {
            title: parsed.title || `The Importance of ${topic}`,
            content: parsed.content || `An article about ${topic}.`
        };

    } catch (error) {
        console.error("Error generating content:", error);
        return {
            title: `The Importance of ${topic}`,
            content: `
# Why ${topic} Matters

*Note: This is a generated placeholder article because the AI service encountered an error.*

## Understanding the Basics
${topic} is becoming an increasingly important topic in modern healthcare.

## Key Takeaways
* **Prevention is key**: Early awareness can prevent long-term issues.
* **Professional guidance**: Consulting with your primary care physician is the best way to navigate this.

## How Direct Primary Care Helps
At Present Health, we have the time to discuss complex topics like ${topic} in depth.

## Ready to take control of your health?
Join Present Health today and experience healthcare designed around you.
            `.trim()
        };
    }
}
