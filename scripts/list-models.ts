
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("No API Key found");
            return;
        }

        // The SDK doesn't expose listModels directly on the main class easily in all versions, 
        // but let's try to fetch it via REST if SDK fails, or check if SDK has it.
        // Actually, looking at SDK docs, it might not have a simple listModels method exposed on the client instance directly in this version?
        // Let's try to use the API directly via fetch to list models.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
