-- Add Private Pay fields to trips table
-- SAFE FOR PRODUCTION: Only adds new columns, does not modify existing data

-- Add private pay columns if they don't exist
DO $$
BEGIN
    -- is_private_pay: boolean flag to mark trip as privately paid
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'is_private_pay'
    ) THEN
        ALTER TABLE trips ADD COLUMN is_private_pay BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_private_pay column to trips table';
    ELSE
        RAISE NOTICE 'is_private_pay column already exists';
    END IF;

    -- private_pay_date: when the private payment was made
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'private_pay_date'
    ) THEN
        ALTER TABLE trips ADD COLUMN private_pay_date TIMESTAMPTZ;
        RAISE NOTICE 'Added private_pay_date column to trips table';
    ELSE
        RAISE NOTICE 'private_pay_date column already exists';
    END IF;

    -- private_pay_amount: the amount paid privately (should match price)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'private_pay_amount'
    ) THEN
        ALTER TABLE trips ADD COLUMN private_pay_amount DECIMAL(10,2);
        RAISE NOTICE 'Added private_pay_amount column to trips table';
    ELSE
        RAISE NOTICE 'private_pay_amount column already exists';
    END IF;

    -- private_pay_stripe_id: Stripe payment intent ID for the private payment
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'private_pay_stripe_id'
    ) THEN
        ALTER TABLE trips ADD COLUMN private_pay_stripe_id TEXT;
        RAISE NOTICE 'Added private_pay_stripe_id column to trips table';
    ELSE
        RAISE NOTICE 'private_pay_stripe_id column already exists';
    END IF;

    -- private_pay_method: payment method used (card, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'trips' AND column_name = 'private_pay_method'
    ) THEN
        ALTER TABLE trips ADD COLUMN private_pay_method TEXT;
        RAISE NOTICE 'Added private_pay_method column to trips table';
    ELSE
        RAISE NOTICE 'private_pay_method column already exists';
    END IF;
END $$;

-- Create index for efficient billing queries that exclude private pay trips
CREATE INDEX IF NOT EXISTS idx_trips_private_pay ON trips(is_private_pay) WHERE is_private_pay = TRUE;

-- Create index for finding privately paid trips by facility
CREATE INDEX IF NOT EXISTS idx_trips_facility_private_pay ON trips(facility_id, is_private_pay) WHERE is_private_pay = TRUE;
