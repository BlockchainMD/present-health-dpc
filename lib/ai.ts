import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini lazily inside the function
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateArticleContent(topic: string): Promise<{ title: string; content: string }> {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("Missing GEMINI_API_KEY. Returning mock content.");
        return {
            title: `Why ${topic} Matters for Your Health`,
            content: `
# Understanding ${topic}

This is a placeholder article generated because the GEMINI_API_KEY is missing. 

## Key Takeaways
* Point 1 about ${topic}
* Point 2 about ${topic}

## How Present Health Helps
We offer direct access to care that can help you manage this.
      `
        };
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT" as any,
                    properties: {
                        title: { type: "STRING" as any },
                        content: { type: "STRING" as any }
                    },
                    required: ["title", "content"]
                }
            }
        });

        const prompt = `
      Act as an expert health content strategist for Present Health, a Direct Primary Care (DPC) practice.
      Write a high-ranking SEO blog post about "${topic}".

      Goals:
      1. SEO Optimization: Target high-intent keywords related to the topic. Answer "People Also Ask" style questions.
      2. Tone: Authoritative, professional, and accessible (Grade 8 reading level). Do NOT use first-person ("I", "me"). Use "Present Health" or "we" when referring to the practice.
      3. Structure: Use engaging H2/H3 headings, bullet points, and short paragraphs for readability.
      4. Value Proposition: Clearly explain why this topic matters and how the Direct Primary Care model provides a superior solution compared to traditional insurance-based care.
      5. Call to Action: End with a compelling reason to join Present Health.

      Format:
      - Return ONLY a JSON object.
      - JSON format: { "title": "SEO-Optimized, Catchy Title", "content": "Markdown content..." }
      - Do not include markdown code blocks around the JSON.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting in response
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Error generating content:", error);
        // @ts-ignore
        if (error.response) {
            // @ts-ignore
            console.error("API Response Error:", await error.response.text());
        }
        // Fallback to mock content on error so the app remains functional for demo
        return {
            title: `The Importance of ${topic}`,
            content: `
# Why ${topic} Matters

*Note: This is a generated placeholder article because the AI service is currently unavailable.*

## Understanding the Basics
${topic} is becoming an increasingly important topic in modern healthcare. Understanding the fundamentals can help you make better decisions about your well-being.

## Key Takeaways
* **Prevention is key**: Early awareness of ${topic} can prevent long-term issues.
* **Lifestyle factors**: Simple changes in your daily routine can have a positive impact.
* **Professional guidance**: Consulting with your primary care physician is the best way to navigate this.

## How Direct Primary Care Helps
At Present Health, we have the time to discuss complex topics like ${topic} in depth. Unlike traditional practices where visits are rushed, we prioritize your understanding and comfort.

## Ready to take control of your health?
Join Present Health today and experience healthcare designed around you.
            `.trim()
        };
    }
}
