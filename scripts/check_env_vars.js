
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasDbUrl = envContent.includes('DATABASE_URL=');
    const hasServiceKey = envContent.includes('SERVICE_KEY') || envContent.includes('SERVICE_ROLE');

    console.log('Has DATABASE_URL:', hasDbUrl);
    console.log('Has Service Key:', hasServiceKey);

    if (hasDbUrl) {
        // Extract it to verify it's not empty (don't print it)
        const lines = envContent.split('\n');
        const dbUrlLine = lines.find(l => l.startsWith('DATABASE_URL='));
        console.log('DATABASE_URL length:', dbUrlLine?.split('=')[1]?.trim().length);
    }
} catch (e) {
    console.error('Error reading .env:', e.message);
}
