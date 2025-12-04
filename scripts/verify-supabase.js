
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

async function test() {
    console.log('Testing SELECT...');
    const start = Date.now();

    // Create a timeout promise
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000));

    try {
        // 1. Fetch lightweight list
        const { data: tickets, error: listError } = await supabase
            .from('tickets')
            .select('id')
            .limit(1);

        if (listError) throw listError;
        if (tickets.length === 0) {
            console.log('No tickets found.');
            return;
        }

        const ticketId = tickets[0].id;
        console.log('Fetching details for ticket:', ticketId);

        // 2. Fetch full details
        const detailPromise = supabase
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        const { data: detail, error: detailError } = await Promise.race([detailPromise, timeout]);

        if (detailError) {
            console.error('DETAIL Error:', detailError);
        } else {
            console.log('DETAIL Success! Comments length:', JSON.stringify(detail.comments).length);
        }
    } catch (e) {
        console.error('SELECT Failed:', e.message);
    }

    console.log('Testing UPSERT...');
    try {
        const upsertPromise = supabase.from('tickets').upsert({
            id: 'test-connection-check',
            title: 'Connection Check',
            status: 'Open',
            priority: 'Low',
            description: 'Test'
        }).select();

        const { data, error } = await Promise.race([upsertPromise, timeout]);
        if (error) {
            console.error('UPSERT Error:', error);
        } else {
            console.log('UPSERT Success!');
        }
    } catch (e) {
        console.error('UPSERT Failed:', e.message);
    }
}

test();
