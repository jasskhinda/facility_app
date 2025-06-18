-- Setup script to create a facility and associate your account with it
-- Run this in Supabase SQL Editor after the migration

-- First, let's see what users exist and their current roles
SELECT id, email, role, facility_id FROM profiles WHERE role = 'facility' OR email LIKE '%compassionate%' OR email LIKE '%admin%';

-- If you don't see your account above, we'll create a facility and update your profile
-- Replace 'YOUR_EMAIL_HERE' with your actual login email

-- Create a sample facility (you can modify the details)
INSERT INTO facilities (name, address, phone_number, contact_email, billing_email, facility_type)
VALUES (
  'Compassionate Care Transportation',
  '123 Main Street, Your City, State 12345',
  '(555) 123-4567',
  'admin@compassionatecaretransportation.com',
  'billing@compassionatecaretransportation.com',
  'medical_transport'
) 
ON CONFLICT DO NOTHING
RETURNING id, name;

-- Get the facility ID we just created (or existing one)
-- You'll need to use this ID in the next step
SELECT id, name FROM facilities WHERE name = 'Compassionate Care Transportation';

-- Update your user profile to be associated with the facility
-- IMPORTANT: Replace 'YOUR_EMAIL_HERE' with your actual email
-- IMPORTANT: Replace 'FACILITY_ID_FROM_ABOVE' with the actual facility ID from the previous query

UPDATE profiles 
SET 
  role = 'facility',
  facility_id = (SELECT id FROM facilities WHERE name = 'Compassionate Care Transportation' LIMIT 1)
WHERE email = 'YOUR_EMAIL_HERE';

-- Verify the update worked
SELECT id, email, role, facility_id FROM profiles WHERE email = 'YOUR_EMAIL_HERE';
