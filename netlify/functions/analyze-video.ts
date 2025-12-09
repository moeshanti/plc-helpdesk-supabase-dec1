
import { Handler } from '@netlify/functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const handler: Handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Temporary file path
    const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}.mp4`);
    let fileManager: GoogleAIFileManager | null = null;
    let uploadResult: any = null;

    try {
        const { videoUrl, mimeType, erpName, module } = JSON.parse(event.body || '{}');
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error: API Key missing' }) };
        }

        if (!videoUrl) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing videoUrl' }) };
        }

        // 1. Download the video file from the URL to /tmp
        console.time("Download Video");
        console.log(`Downloading video from: ${videoUrl}`);
        const videoResponse = await fetch(videoUrl);
        // ... (existing checks)
        await finished(Readable.fromWeb(videoResponse.body).pipe(fileStream));
        console.timeEnd("Download Video");
        console.log(`Video downloaded to: ${tempFilePath}`);

        // 2. Upload to Google AI File Manager
        console.time("Upload to Gemini");
        fileManager = new GoogleAIFileManager(apiKey);
        uploadResult = await fileManager.uploadFile(tempFilePath, {
            mimeType: mimeType || 'video/mp4',
            displayName: `Ticket Video ${new Date().toISOString()}`,
        });
        console.timeEnd("Upload to Gemini");
        console.log(`Uploaded to Gemini: ${uploadResult.file.uri} (${uploadResult.file.state})`);

        // Wait for processing
        console.time("Gemini Processing");
        let file = await fileManager.getFile(uploadResult.file.name);
        while (file.state === "PROCESSING") {
            const processingTime = process.uptime();
            console.log(`Waiting for video processing... (${processingTime.toFixed(2)}s)`);
            if (processingTime > 20) throw new Error("Processing timeout warning");

            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
        }
        console.timeEnd("Gemini Processing");

        if (file.state === "FAILED") {
            throw new Error("Video processing failed by Gemini");
        }

        // 3. Analyze with Gemini
        console.time("Gemini Generation");
        const genAI = new GoogleGenerativeAI(apiKey);

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

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            fileData: {
                                mimeType: file.mimeType,
                                fileUri: file.uri
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const response = await result.response;
        const text = response.text();
        // Since we force JSON, no need to strip markdown
        const jsonString = text;

        // Cleanup: File manager files expire automatically, but we can delete to be clean
        await fileManager.deleteFile(uploadResult.file.name);

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
    } finally {
        // Cleanup local temp file
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }
    }
};

export { handler };
