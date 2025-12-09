-- RLS Policies for app_settings (FIXED for Dev Mode)

-- Enable RLS
alter table if exists public.app_settings enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Enable read access for all users" on public.app_settings;
drop policy if exists "Enable insert for authenticated users only" on public.app_settings;
drop policy if exists "Enable update for authenticated users only" on public.app_settings;
drop policy if exists "Enable delete for authenticated users only" on public.app_settings;
drop policy if exists "Enable all for authenticated users" on public.app_settings;

-- Create Policies

-- 1. READ: Everyone can read settings
create policy "Enable read access for all users" 
on public.app_settings for select 
using (true);

-- 2. INSERT/UPDATE: Allow everyone (including anon) to update settings
-- RATIONALE: The application currently uses a "Dev Mode" mock user system without real Supabase Authentication.
-- Therefore, all requests come from the 'anon' role. Restricting to 'authenticated' breaks the functionality.
-- Security Warning: This allows anyone with the Anon Key to update settings. Acceptable for internal dev/demo.

create policy "Enable insert for all users" 
on public.app_settings for insert 
with check (true);

create policy "Enable update for all users" 
on public.app_settings for update 
using (true);

-- 3. DELETE: Allow all
create policy "Enable delete for all users" 
on public.app_settings for delete 
using (true);
