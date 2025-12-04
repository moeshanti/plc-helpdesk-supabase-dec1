-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for all users" ON ticket_slas;
DROP POLICY IF EXISTS "Enable write access for all users" ON ticket_slas;

-- Enable RLS (just in case)
ALTER TABLE ticket_slas ENABLE ROW LEVEL SECURITY;

-- Create a permissive policy for development (allows SELECT, INSERT, UPDATE, DELETE for everyone)
CREATE POLICY "Allow full access for all users" ON ticket_slas
    FOR ALL
    USING (true)
    WITH CHECK (true);
