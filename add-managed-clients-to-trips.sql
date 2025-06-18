-- Migration: Add support for managed clients in trips table
-- This allows trips to be created for clients managed by facilities
-- who don't have their own user accounts

-- Add managed_client_id field to trips table
ALTER TABLE trips ADD COLUMN managed_client_id UUID REFERENCES facility_managed_clients(id);

-- Make user_id nullable since managed clients won't have user accounts
ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id OR managed_client_id is provided
ALTER TABLE trips ADD CONSTRAINT trips_client_check 
CHECK (
  (user_id IS NOT NULL AND managed_client_id IS NULL) OR 
  (user_id IS NULL AND managed_client_id IS NOT NULL)
);

-- Update RLS policies to handle managed clients
-- Allow facility admins to see trips for their managed clients
CREATE POLICY "Facility admins can view their managed client trips" 
ON trips FOR SELECT 
USING (
  managed_client_id IN (
    SELECT id FROM facility_managed_clients 
    WHERE facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE id = auth.uid() AND role = 'facility'
    )
  )
);

-- Allow facility admins to insert trips for their managed clients
CREATE POLICY "Facility admins can insert managed client trips" 
ON trips FOR INSERT 
WITH CHECK (
  managed_client_id IN (
    SELECT id FROM facility_managed_clients 
    WHERE facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE id = auth.uid() AND role = 'facility'
    )
  )
);

-- Allow facility admins to update trips for their managed clients
CREATE POLICY "Facility admins can update managed client trips" 
ON trips FOR UPDATE 
USING (
  managed_client_id IN (
    SELECT id FROM facility_managed_clients 
    WHERE facility_id IN (
      SELECT facility_id FROM profiles 
      WHERE id = auth.uid() AND role = 'facility'
    )
  )
);

-- Add booked_by field to track who created the trip (for facility bookings)
ALTER TABLE trips ADD COLUMN booked_by UUID REFERENCES auth.users(id);

-- Add bill_to field to specify billing (facility or client)
ALTER TABLE trips ADD COLUMN bill_to TEXT DEFAULT 'facility' CHECK (bill_to IN ('facility', 'client'));

-- Add facility_id field for easier querying
ALTER TABLE trips ADD COLUMN facility_id UUID REFERENCES facilities(id);

-- Create index for better performance
CREATE INDEX idx_trips_managed_client_id ON trips(managed_client_id);
CREATE INDEX idx_trips_facility_id ON trips(facility_id);
CREATE INDEX idx_trips_booked_by ON trips(booked_by);
