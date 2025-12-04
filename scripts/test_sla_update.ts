
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

async function testUpdate() {
    console.log('Fetching Critical SLA...');
    const { data: slas, error: fetchError } = await supabase
        .from('ticket_slas')
        .select('*')
        .eq('priority', 'Critical')
        .single();

    if (fetchError) {
        console.error('Fetch failed:', fetchError);
        return;
    }

    console.log('Current Critical SLA:', slas);

    const newHours = slas.resolution_hours === 4 ? 5 : 4;
    console.log(`Attempting to update to ${newHours} hours...`);

    const { error: updateError } = await supabase
        .from('ticket_slas')
        .update({ resolution_hours: newHours })
        .eq('id', slas.id);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('Update successful!');

        // Verify
        const { data: updated } = await supabase
            .from('ticket_slas')
            .select('*')
            .eq('id', slas.id)
            .single();
        console.log('Verified new value:', updated.resolution_hours);
    }
}

testUpdate();
