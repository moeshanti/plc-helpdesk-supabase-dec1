
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking ticket_slas table...');
    const { data, error } = await supabase.from('ticket_slas').select('*').limit(1);

    if (error) {
        console.error('Error accessing ticket_slas:', error.message);
    } else {
        console.log('Success! ticket_slas table exists.');
        console.log('Data sample:', data);
    }
}

checkTables();
