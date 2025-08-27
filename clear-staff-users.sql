-- Clear all staff users from the database
-- Run this in your Supabase SQL editor

-- First, let's see what staff users exist
SELECT id, staff_code, full_name, role, created_at 
FROM staff_users 
ORDER BY created_at;

-- Delete all staff users
DELETE FROM staff_users;

-- Verify all staff users are deleted
SELECT COUNT(*) as remaining_staff_users FROM staff_users;

-- Optional: Reset the sequence if you're using auto-incrementing IDs
-- (Not needed for UUID primary keys, but included for completeness)
-- ALTER SEQUENCE staff_users_id_seq RESTART WITH 1;
