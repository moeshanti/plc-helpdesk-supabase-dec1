import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { videoBase64, mimeType, erpName, module } = JSON.parse(event.body || '{}');
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: API Key missing' }) };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        // gemini-1.5-flash is not available, using gemini-2.0-flash which is also multimodal and fast
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are an expert QA and Support Engineer for ${erpName || 'ERP Systems'}. 
        The user is reporting an issue in the "${module || 'General'}" module.
        Watch this video recording of the ${erpName || 'ERP'} interface.
        
        Extract ONLY valid JSON with the following fields:
        { 
            "title": "A concise, professional ticket title", 
            "description": "A detailed description of the issue observed", 
            "steps": "Step-by-step reproduction steps based on the video actions", 
            "module": "The likely module (e.g. Sales, Accounting) - confirm if it matches '${module}'" 
        }`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: videoBase64,
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json\n?|\n?```/g, '').trim();

        return {
            statusCode: 200,
            body: JSON.stringify({ text: jsonString }),
        };
    } catch (error: any) {
        console.error("Gemini Video Analysis Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to analyze video' }),
        };
    }
};

export { handler };
