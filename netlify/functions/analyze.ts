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
        
        Please provide your response in the following strict format:
        
        **Suggested Title:** 
        [Write a short, professional ticket subject line here based on the images]

        **Steps to Reproduce:**
        [Deduce probable steps to reproduce this error based on the screen context (e.g. 1. Open 'Sales Order'. 2. Click 'Post'.). Keep it concise.]
        
        **Analysis:**
        [Provide a friendly, concise analysis of the error for the user here. If it's a common error like 'Period Closed', suggest a fix.]
        `;
        } else {
            promptText += `
        These screenshots were added to an existing ticket comment. Provide a deep technical analysis for the ERP support team.
        
        1. **Error Extraction**: Perform OCR to extract exact 1C error codes, message text, and object names (e.g., "Document.Invoice", "Catalog.Partners").
        2. **1C Context**: Identify if this is a platform error (1cv8.exe crash), a configuration error (Managed Forms issue), or a data error (Duplicate Key, Posting Lock).
        3. **Troubleshooting**: Suggest where to check in the 1C Designer or Enterprise mode (e.g., "Check the Event Log (Zhurnal Registratsii)", "Debug the 'Posting' event module", "Check Functional Options").
        4. **Solution**: If possible, suggest a code fix or a data correction step.
        
        Format the output using Markdown with bold headers like "**1C Error Analysis**" and "**Suggested Solution**".`;
        }

        const imageParts = images.map((img: any) => ({
            inlineData: {
                data: img.inlineData.data,
                mimeType: img.inlineData.mimeType
            }
        }));

        const result = await model.generateContent([promptText, ...imageParts]);
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
