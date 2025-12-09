-- Add tagline column to app_settings

alter table if exists public.app_settings 
add column if not exists tagline text;

-- No need to update RLS policies as the existing ones cover all columns (using 'true' or 'authenticated')
