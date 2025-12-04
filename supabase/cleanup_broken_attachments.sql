-- SQL Script to clean up broken attachments (Blob URLs) from the tickets table

-- This script iterates through the 'attachments' JSONB array for each ticket
-- and removes any element where the 'url' field starts with 'blob:'.
-- It assumes 'attachments' is a JSONB array of objects.

UPDATE public.tickets
SET attachments = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(attachments) AS elem
  WHERE (elem->>'url') NOT LIKE 'blob:%'
    AND (elem->>'url') IS NOT NULL
    AND (elem->>'url') != ''
)
WHERE attachments IS NOT NULL 
  AND jsonb_typeof(attachments) = 'array'
  -- Only update rows that actually have broken links to avoid unnecessary writes
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(attachments) AS elem
    WHERE (elem->>'url') LIKE 'blob:%'
  );

-- Optional: If you want to be more aggressive and remove anything that isn't a valid Supabase URL or external URL (starting with http/https)
-- Uncomment the block below:

/*
UPDATE public.tickets
SET attachments = (
  SELECT jsonb_agg(elem)
  FROM jsonb_array_elements(attachments) AS elem
  WHERE (elem->>'url') LIKE 'http%'
)
WHERE attachments IS NOT NULL 
  AND jsonb_typeof(attachments) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(attachments) AS elem
    WHERE (elem->>'url') NOT LIKE 'http%'
  );
*/
