import { handler } from '../netlify/functions/analyze';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

async function runTest() {
    try {
        console.log("Starting test...");

        // Path to the generated image
        // Note: The image path from generate_image tool was: /Users/mohammadelshanti/.gemini/antigravity/brain/6eec95d1-78d5-4df8-acbd-9828ca768020/test_error_screenshot_1764621491662.png
        // I need to copy it or read it from there. 
        // For this script, I'll assume I can read it from the absolute path.
        const imagePath = '/Users/mohammadelshanti/.gemini/antigravity/brain/6eec95d1-78d5-4df8-acbd-9828ca768020/test_error_screenshot_1764621491662.png';

        if (!fs.existsSync(imagePath)) {
            console.error(`Image not found at ${imagePath}`);
            return;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        // Mock browser request via proxy
        const response = await fetch('http://localhost:3000/.netlify/functions/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                images: [{
                    inlineData: {
                        data: base64Image,
                        mimeType: 'image/png'
                    }
                }],
                context: "User is reporting a 404 error.",
                isCreationMode: true
            })
        });

        const result = {
            statusCode: response.status,
            body: await response.text()
        };

        console.log("Result Status:", result?.statusCode);
        console.log("Result Body:", result?.body);

        if (result?.statusCode === 200) {
            console.log("SUCCESS: Analysis generated.");
        } else {
            console.error("FAILURE: Analysis failed.");
        }

    } catch (error) {
        console.error("Test Error:", error);
    }
}

runTest();
