
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

async function updateTimestamps() {
    console.log('Fetching tickets...');
    const { data: tickets, error } = await supabase.from('tickets').select('id, priority');

    if (error) {
        console.error('Error fetching tickets:', error);
        return;
    }

    console.log(`Found ${tickets.length} tickets. Updating timestamps...`);

    for (const ticket of tickets) {
        // Set created_at based on priority to ensure some are active and some overdue
        // Critical (4h): Set to 2h ago (Active) or 5h ago (Overdue)
        // High (8h): Set to 4h ago (Active)
        // Medium (24h): Set to 10h ago (Active)
        // Low (48h): Set to 20h ago (Active)

        let hoursAgo = 1;
        if (ticket.priority === 'Critical') hoursAgo = Math.random() > 0.5 ? 2 : 5;
        else if (ticket.priority === 'High') hoursAgo = 4;
        else if (ticket.priority === 'Medium') hoursAgo = 10;
        else hoursAgo = 20;

        const newDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));

        const { error: updateError } = await supabase
            .from('tickets')
            .update({ created_at: newDate.toISOString() })
            .eq('id', ticket.id);

        if (updateError) {
            console.error(`Failed to update ticket ${ticket.id}:`, updateError.message);
        } else {
            console.log(`Updated ticket ${ticket.id} (${ticket.priority}) to ${hoursAgo}h ago.`);
        }
    }
    console.log('Done!');
}

updateTimestamps();
