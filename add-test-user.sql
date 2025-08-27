-- Add test user with staff code 920 and PIN 1234
-- Run this in your Supabase SQL editor after clearing staff users

-- Insert the test user with properly hashed PIN
INSERT INTO staff_users (id, staff_code, full_name, role, pin_hash, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '920',
  'Test User',
  'manager',
  '$2a$10$brosiE6TmQ0084Q.tjTgL.docvNN4RcEsaBm07z25rET1Qk6zxcuu',
  NOW(),
  NOW()
);

-- Verify the user was created
SELECT id, staff_code, full_name, role, created_at 
FROM staff_users 
WHERE staff_code = '920';
