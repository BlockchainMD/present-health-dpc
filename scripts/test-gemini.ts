

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
if (!apiKey) {
    console.error("Set GEMINI_API_KEY or GOOGLE_API_KEY env var");
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
    try {
        console.log("Listing available models...");
        // @ts-ignore
        const modelList = await genAI.getGenerativeModel({ model: "gemini-pro" }).apiKey;
        // The SDK doesn't have a direct listModels method on the client instance in some versions, 
        // but we can try a direct fetch to the API to see what's up if the SDK is obscure.
        // Actually, let's just try a simple curl command via run_command to list models, 
        // as the SDK might hide the raw response.

        // But first, let's try 'gemini-1.0-pro' which is sometimes the specific name needed.
        console.log("Testing with model: gemini-2.0-flash");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Say hello");
        const response = await result.response;
        console.log("Success with gemini-2.0-flash! Response:", response.text());

    } catch (error) {
        console.error("Error with gemini-2.0-flash:", error);
    }
}

test();
