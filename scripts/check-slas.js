
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSlas() {
    const { data, error } = await supabase
        .from('ticket_slas')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching SLAs:', error);
    } else {
        console.log('SLA Data:', JSON.stringify(data, null, 2));
    }
}

checkSlas();
