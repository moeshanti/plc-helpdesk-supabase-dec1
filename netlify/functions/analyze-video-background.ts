
import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const handler: Handler = async (event) => {
    // Background functions don't return a response to the client immediately in the same way, 
    // but Netlify returns 202 automatically. We just need to do the work.

    // Note: Background functions run for up to 15 minutes.
    console.log("Starting Background Video Analysis...");

    // Headers for CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
    };

    console.log("INCOMING REQUEST:", event.httpMethod, event.path);

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod === 'GET') {
        return { statusCode: 200, headers, body: 'Background Function is Alive & Reachable!' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    let tempFilePath = '';
    let analysisId: string | undefined;
    let supabase: any;

    // Debug logging
    console.log("RAW BODY LENGTH:", event.body?.length || 0);

    try {
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch (parseError) {
            console.error("JSON PARSE FAILED:", parseError);
            return { statusCode: 400, headers, body: 'Invalid JSON' };
        }

        analysisId = body.analysisId; // Assign to outer variable
        console.log("Parsed Analysis ID:", analysisId);

        const { videoUrl, mimeType, erpName, module, accessToken } = body;

        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        console.log("DEBUG: Checking API Keys...");
        console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
        console.log("VITE_GEMINI_API_KEY present:", !!process.env.VITE_GEMINI_API_KEY);
        console.log("Calculated apiKey length:", apiKey?.length || 0);

        // Supabase Setup
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (!apiKey || !supabaseUrl || !supabaseKey) {
            console.error("Configuration Error: Missing API Keys");
            return { statusCode: 500, body: 'Server config error' };
        }

        // Initialize Supabase Client
        // Initialize Supabase Client
        // If accessToken is provided, use it. Otherwise, default to Anon (similar to frontend)
        const clientOptions = accessToken ? {
            global: {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        } : {};

        supabase = createClient(supabaseUrl, supabaseKey, clientOptions);

        // Use URL if provided (Preferred for large files)
        if (!videoUrl) {
            console.error("No video URL provided for background analysis.");
            return { statusCode: 400, body: 'Video URL required' };
        }

        // 1. Download Video
        tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}.mp4`);
        console.log(`Downloading video from: ${videoUrl}`);
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);

        const fileStream = fs.createWriteStream(tempFilePath);
        // @ts-ignore
        await finished(Readable.fromWeb(videoResponse.body).pipe(fileStream));
        console.log(`Video downloaded to: ${tempFilePath}`);

        // 2. Upload to Gemini
        const fileManager = new GoogleAIFileManager(apiKey);
        const uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: mimeType || 'video/mp4',
            displayName: `Ticket Video ${new Date().toISOString()}`,
        });
        console.log(`Uploaded to Gemini: ${uploadResult.file.uri} (${uploadResult.file.state})`);

        // 3. Wait for Processing
        let file = await fileManager.getFile(uploadResult.file.name);
        let attempts = 0;
        while (file.state === "PROCESSING") {
            attempts++;
            console.log(`Waiting for processing... Attempt ${attempts}`);
            await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5s
            file = await fileManager.getFile(uploadResult.file.name);
            if (attempts > 100) throw new Error("Processing timeout (Internal Limit)"); // 500s
        }

        if (file.state === "FAILED") throw new Error("Video processing failed by Gemini");

        // 4. Analyze
        const genAI = new GoogleGenerativeAI(apiKey);
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
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri
                }
            }
        ]);

        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json\n?|\n?```/g, '').trim();
        console.log("Analysis Result JSON:", jsonString);

        // 5. Save Result to Supabase Storage
        const resultFileName = `analysis/${analysisId}.json`;
        console.log(`Uploading result to Storage: ${resultFileName}`);

        const { error: uploadError } = await supabase.storage
            .from('ticket-attachments') // Ensure this bucket exists and is writable
            .upload(resultFileName, jsonString, {
                contentType: 'application/json',
                upsert: true
            });

        if (uploadError) {
            console.error("Failed to upload analysis result:", uploadError);
            throw uploadError;
        }

        console.log("Analysis completed and saved successfully.");
        return { statusCode: 200, headers, body: 'Success' };

    } catch (error: any) {
        console.error("BACKGROUND ANALYSIS FAILED:", error);

        try {
            if (supabase && analysisId) {
                const errorData = { error: error.message || "Unknown error occurred" };
                await supabase.storage
                    .from('ticket-attachments')
                    .upload(`analysis/${analysisId}_error.json`, JSON.stringify(errorData), {
                        contentType: 'application/json',
                        upsert: true
                    });
                console.log("Uploaded error report to Supabase");
            } else {
                console.error("Supabase client or analysisId not available to upload error report.");
            }
        } catch (writeError) {
            console.error("Failed to write error report:", writeError);
        }
        return { statusCode: 500, headers, body: error.message };

    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            console.log("Deleted temp video file");
        }
    }
};

export { handler };
