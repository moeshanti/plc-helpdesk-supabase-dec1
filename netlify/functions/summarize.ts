import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { prompt } = JSON.parse(event.body || '{}');
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: API Key missing' }) };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ text }),
        };

    } catch (error: any) {
        console.error("Gemini Summarize Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to generate summary' }),
        };
    }
};

export { handler };
