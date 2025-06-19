-- Add additional_passengers column to trips table
-- This column is needed for the StreamlinedBookingForm component

-- Add additional_passengers column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'additional_passengers') THEN
        ALTER TABLE trips ADD COLUMN additional_passengers INTEGER DEFAULT 0;
        COMMENT ON COLUMN trips.additional_passengers IS 'Number of additional passengers beyond the primary client';
    END IF;
END $$;

-- Add other missing columns that might be needed for the booking forms

-- Add trip_notes column if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'trip_notes') THEN
        ALTER TABLE trips ADD COLUMN trip_notes TEXT;
        COMMENT ON COLUMN trips.trip_notes IS 'Special instructions or notes for the trip';
    END IF;
END $$;

-- Add pickup_details column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'pickup_details') THEN
        ALTER TABLE trips ADD COLUMN pickup_details TEXT;
        COMMENT ON COLUMN trips.pickup_details IS 'Additional details about pickup location';
    END IF;
END $$;

-- Add destination_details column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'destination_details') THEN
        ALTER TABLE trips ADD COLUMN destination_details TEXT;
        COMMENT ON COLUMN trips.destination_details IS 'Additional details about destination location';
    END IF;
END $$;

-- Add booked_by column if it doesn't exist (tracks who created the booking)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'booked_by') THEN
        ALTER TABLE trips ADD COLUMN booked_by UUID REFERENCES auth.users(id);
        COMMENT ON COLUMN trips.booked_by IS 'User who created this booking (facility admin or client)';
    END IF;
END $$;

-- Add bill_to column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'bill_to') THEN
        ALTER TABLE trips ADD COLUMN bill_to TEXT DEFAULT 'facility';
        COMMENT ON COLUMN trips.bill_to IS 'Who should be billed for this trip: facility or client';
    END IF;
END $$;

-- Add managed_client_id column if it doesn't exist (for non-authenticated clients)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'managed_client_id') THEN
        ALTER TABLE trips ADD COLUMN managed_client_id UUID;
        COMMENT ON COLUMN trips.managed_client_id IS 'Reference to managed client (non-authenticated)';
    END IF;
END $$;

-- Add route tracking columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration') THEN
        ALTER TABLE trips ADD COLUMN route_duration TEXT;
        COMMENT ON COLUMN trips.route_duration IS 'Estimated duration from route calculation';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_distance_text') THEN
        ALTER TABLE trips ADD COLUMN route_distance_text TEXT;
        COMMENT ON COLUMN trips.route_distance_text IS 'Human readable distance from route calculation';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'route_duration_text') THEN
        ALTER TABLE trips ADD COLUMN route_duration_text TEXT;
        COMMENT ON COLUMN trips.route_duration_text IS 'Human readable duration from route calculation';
    END IF;
END $$;

-- Add related_trip_id for round trips
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trips' AND column_name = 'related_trip_id') THEN
        ALTER TABLE trips ADD COLUMN related_trip_id UUID REFERENCES trips(id);
        COMMENT ON COLUMN trips.related_trip_id IS 'Links return trip to original trip for round trips';
    END IF;
END $$;

-- Update the wheelchair type check constraint to include new types
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'trips' AND constraint_name = 'trips_wheelchair_type_check') THEN
        ALTER TABLE trips DROP CONSTRAINT trips_wheelchair_type_check;
    END IF;
    
    -- Add new constraint with all wheelchair types
    ALTER TABLE trips ADD CONSTRAINT trips_wheelchair_type_check 
    CHECK (wheelchair_type IN ('no_wheelchair', 'wheelchair', 'foldable', 'power'));
END $$;

-- Update the bill_to check constraint
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'trips' AND constraint_name = 'trips_bill_to_check') THEN
        ALTER TABLE trips DROP CONSTRAINT trips_bill_to_check;
    END IF;
    
    -- Add new constraint
    ALTER TABLE trips ADD CONSTRAINT trips_bill_to_check 
    CHECK (bill_to IN ('facility', 'client'));
END $$;
