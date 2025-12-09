
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const handler: Handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    const { analysisId } = event.queryStringParameters || {};

    if (!analysisId) {
        return { statusCode: 400, headers, body: 'Missing analysisId' };
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; // Fallback to Anon if Service Key missing (though Service is needed for private access)

    if (!supabaseUrl || !supabaseServiceKey) {
        return { statusCode: 500, headers, body: 'Server Configuration Error' };
    }

    // Use Service Key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resultPath = `analysis/${analysisId}.json`;
    const errorPath = `analysis/${analysisId}_error.json`;

    try {
        // Try to download the result file
        const { data, error } = await supabase.storage
            .from('ticket-attachments')
            .download(resultPath);

        if (data) {
            const text = await data.text();
            return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: text
            };
        }

        // If not found, check for error file
        if (error) {
            const { data: errorData } = await supabase.storage
                .from('ticket-attachments')
                .download(errorPath);

            if (errorData) {
                const errorText = await errorData.text();
                return {
                    statusCode: 422, // Unprocessable Entity (Analysis Failed)
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    body: errorText
                };
            }

            // If neither found, it's a 404 (Not Ready Yet)
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Analysis not ready or not found" }) };
        }

        return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };

    } catch (e: any) {
        console.error("Proxy Download Error:", e);
        return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
};

export { handler };
