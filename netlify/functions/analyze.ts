import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { images, context, isCreationMode } = JSON.parse(event.body || '{}');
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: API Key missing' }) };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let promptText = `You are a Senior 1C:Enterprise ERP Expert and Developer. 
    Analyze the provided screenshot(s) which are attachments in a 1C ERP Helpdesk Ticket.
    Context provided by user: "${context}".`;

        if (isCreationMode) {
            promptText += `
        The user is currently attempting to create a ticket.
        
        Extract ONLY valid JSON with the following fields:
        { 
            "title": "A concise, professional ticket subject line based on the images", 
            "steps": "Deduce probable steps to reproduce this error based on the screen context (e.g. 1. Open 'Sales Order'. 2. Click 'Post'.). Keep it concise.", 
            "description": "Provide a friendly, concise analysis of the error for the user here. If it's a common error like 'Period Closed', suggest a fix."
        }`;
        } else {
            promptText += `
        These screenshots were added to an existing ticket comment. Provide a deep technical analysis for the ERP support team.
        Return the analysis in a JSON field called "description" using Markdown formatting for the value.
        {
            "description": "Markdown formatted analysis..."
        }
        `;
        }

        const imageParts = images.map((img: any) => ({
            inlineData: {
                data: img.inlineData.data,
                mimeType: img.inlineData.mimeType
            }
        }));

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: promptText },
                        ...imageParts
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });
        const response = await result.response;
        const text = response.text();

        return {
            statusCode: 200,
            body: JSON.stringify({ text }),
        };

    } catch (error: any) {
        console.error("Gemini Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Failed to analyze image' }),
        };
    }
};

export { handler };
