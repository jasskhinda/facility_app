-- Create invoices table for professional billing system
-- This table will store invoice records and payment status

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM (e.g., '2025-06')
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_trips INTEGER NOT NULL DEFAULT 0,
  billing_email VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'sent', -- 'sent', 'pending_approval', 'approved', 'paid'
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  due_date DATE,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE,
  approved_by INTEGER REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  trip_ids INTEGER[] DEFAULT '{}', -- Array of trip IDs included in this invoice
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_facility_id ON invoices(facility_id);
CREATE INDEX IF NOT EXISTS idx_invoices_month ON invoices(month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Add RLS (Row Level Security) policies
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy: Facilities can only see their own invoices
CREATE POLICY "Facilities can view own invoices" ON invoices
FOR SELECT USING (
  facility_id IN (
    SELECT facility_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Facilities can insert their own invoices
CREATE POLICY "Facilities can create own invoices" ON invoices
FOR INSERT WITH CHECK (
  facility_id IN (
    SELECT facility_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Facilities can update their own invoices (for notes, etc.)
CREATE POLICY "Facilities can update own invoices" ON invoices
FOR UPDATE USING (
  facility_id IN (
    SELECT facility_id FROM profiles WHERE id = auth.uid()
  )
);

-- Policy: Dispatchers and admins can see all invoices
CREATE POLICY "Dispatchers can view all invoices" ON invoices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('dispatcher', 'admin')
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data for testing (optional)
-- This will be commented out for production use
/*
INSERT INTO invoices (
  invoice_number,
  facility_id,
  month,
  total_amount,
  total_trips,
  billing_email,
  status,
  payment_status,
  due_date,
  trip_ids
) VALUES (
  'CCT-2025-06-SAMPLE',
  1, -- Replace with actual facility ID
  '2025-06',
  250.00,
  5,
  'billing@samplefacility.com',
  'sent',
  'pending',
  '2025-07-23',
  ARRAY[1, 2, 3, 4, 5] -- Replace with actual trip IDs
);
*/

COMMENT ON TABLE invoices IS 'Professional billing invoices for facility transportation services';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice identifier (e.g., CCT-2025-06-ABC123)';
COMMENT ON COLUMN invoices.month IS 'Billing month in YYYY-MM format';
COMMENT ON COLUMN invoices.status IS 'Invoice processing status: sent, pending_approval, approved, paid';
COMMENT ON COLUMN invoices.payment_status IS 'Payment status: pending, paid, overdue';
COMMENT ON COLUMN invoices.trip_ids IS 'Array of trip IDs included in this invoice';
