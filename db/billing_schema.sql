-- billing_schema.sql
-- Schema for trip-based invoicing

-- Create invoices table for individual trip billing
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create billing_summary view for facility dashboards
CREATE OR REPLACE VIEW billing_summary AS
SELECT 
  DATE_TRUNC('month', i.created_at) as billing_month,
  t.facility_id,
  COUNT(i.id) as invoice_count,
  COUNT(DISTINCT i.user_id) as unique_clients,
  SUM(i.total) as total_amount,
  SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as paid_amount,
  SUM(CASE WHEN i.status IN ('pending', 'overdue') THEN i.total ELSE 0 END) as outstanding_amount,
  COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_count
FROM invoices i
LEFT JOIN trips t ON t.id = i.trip_id
WHERE t.facility_id IS NOT NULL
GROUP BY DATE_TRUNC('month', i.created_at), t.facility_id;

-- Create client_billing_summary view for facility client breakdowns
CREATE OR REPLACE VIEW client_billing_summary AS
SELECT 
  i.user_id,
  p.first_name,
  p.last_name,
  p.facility_id,
  COUNT(i.id) as invoice_count,
  SUM(i.total) as total_amount,
  SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END) as paid_amount,
  MAX(i.created_at) as last_invoice_date
FROM invoices i
JOIN profiles p ON p.id = i.user_id
WHERE p.facility_id IS NOT NULL
GROUP BY i.user_id, p.first_name, p.last_name, p.facility_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_trip_id ON invoices(trip_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoice_updated_at();

-- Row Level Security for invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own invoices
CREATE POLICY "Users can view their own invoices" 
ON invoices FOR SELECT 
USING (auth.uid() = user_id);

-- Policy to allow facility admins to view their clients' invoices
CREATE POLICY "Facility admins can view their clients' invoices" 
ON invoices FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
  )
);

-- Policy to allow users to insert their own invoices
CREATE POLICY "Users can insert their own invoices" 
ON invoices FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy to allow facility admins to update their clients' invoices
CREATE POLICY "Facility admins can update their clients' invoices" 
ON invoices FOR UPDATE 
USING (
  user_id IN (
    SELECT id FROM profiles 
    WHERE facility_id = (SELECT facility_id FROM profiles WHERE id = auth.uid() AND role = 'facility')
  )
);

-- Function to create invoice for a trip
CREATE OR REPLACE FUNCTION create_trip_invoice(
  p_trip_id UUID,
  p_amount DECIMAL(10,2),
  p_tax DECIMAL(10,2) DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_user_id UUID;
  v_due_date DATE;
  v_total DECIMAL(10,2);
BEGIN
  -- Get trip details
  SELECT user_id INTO v_user_id
  FROM trips
  WHERE id = p_trip_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;
  
  -- Generate invoice number
  v_invoice_number := 'INV-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                      LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0') || '-' ||
                      SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
  
  -- Calculate total and due date
  v_total := p_amount + COALESCE(p_tax, 0);
  v_due_date := CURRENT_DATE + INTERVAL '30 days';
  
  -- Create invoice
  INSERT INTO invoices (
    invoice_number,
    user_id,
    trip_id,
    amount,
    tax,
    total,
    status,
    due_date,
    description
  ) VALUES (
    v_invoice_number,
    v_user_id,
    p_trip_id,
    p_amount,
    COALESCE(p_tax, 0),
    v_total,
    'pending',
    v_due_date,
    'Transportation service invoice'
  ) RETURNING id INTO v_invoice_id;
  
  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get facility billing summary
CREATE OR REPLACE FUNCTION get_facility_billing_summary(
  p_facility_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
) RETURNS TABLE (
  total_invoices BIGINT,
  total_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2),
  pending_amount DECIMAL(10,2),
  overdue_amount DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(i.id) as total_invoices,
    COALESCE(SUM(i.total), 0) as total_amount,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END), 0) as paid_amount,
    COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.total ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.total ELSE 0 END), 0) as overdue_amount
  FROM invoices i
  JOIN profiles p ON p.id = i.user_id
  WHERE p.facility_id = p_facility_id
    AND (p_start_date IS NULL OR i.created_at >= p_start_date)
    AND (p_end_date IS NULL OR i.created_at <= p_end_date + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;