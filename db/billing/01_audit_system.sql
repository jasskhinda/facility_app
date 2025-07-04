-- Professional Billing System: Audit Trail & Payment Integrity
-- Phase 1: Foundation Implementation
-- Created: 2025-07-04

-- =============================================================================
-- 1. AUDIT LOG SYSTEM
-- =============================================================================

-- Comprehensive audit trail for all billing operations
CREATE TABLE IF NOT EXISTS billing_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(255),
  correlation_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON billing_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON billing_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON billing_audit_log(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON billing_audit_log(action, timestamp);

-- =============================================================================
-- 2. PAYMENT INTEGRITY SYSTEM
-- =============================================================================

-- Enhanced facility_invoice_payments with integrity features
ALTER TABLE facility_invoice_payments 
ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE,
ADD COLUMN IF NOT EXISTS payment_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT,
ADD COLUMN IF NOT EXISTS payment_lock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_lock_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_lock_user UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS rollback_reason TEXT,
ADD COLUMN IF NOT EXISTS rollback_timestamp TIMESTAMP;

-- Payment locking mechanism
CREATE INDEX IF NOT EXISTS idx_payments_lock ON facility_invoice_payments(payment_lock, payment_lock_timestamp);
CREATE INDEX IF NOT EXISTS idx_payments_verification ON facility_invoice_payments(verification_status, created_at);

-- =============================================================================
-- 3. TRIP PAYMENT TRACKING
-- =============================================================================

-- Enhanced trips table with payment tracking
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS payment_lock BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_lock_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_lock_user UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS last_payment_id UUID REFERENCES facility_invoice_payments(id),
ADD COLUMN IF NOT EXISTS payment_history JSONB DEFAULT '[]';

-- Indexes for trip payment tracking
CREATE INDEX IF NOT EXISTS idx_trips_payment_lock ON trips(payment_lock, payment_lock_timestamp);
CREATE INDEX IF NOT EXISTS idx_trips_facility_payment ON trips(facility_id, last_payment_id);

-- =============================================================================
-- 4. PAYMENT RECONCILIATION SYSTEM
-- =============================================================================

-- Daily reconciliation tracking
CREATE TABLE IF NOT EXISTS payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL,
  reconciliation_date DATE NOT NULL,
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  expected_amount DECIMAL(10,2) NOT NULL,
  actual_amount DECIMAL(10,2) NOT NULL,
  discrepancy DECIMAL(10,2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
  trip_count INTEGER NOT NULL,
  payment_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RECONCILED, DISPUTED
  notes TEXT,
  reconciled_by UUID REFERENCES auth.users(id),
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint to prevent duplicate reconciliations
CREATE UNIQUE INDEX IF NOT EXISTS idx_reconciliation_unique 
ON payment_reconciliation(facility_id, month, reconciliation_date);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON payment_reconciliation(status, reconciliation_date);
CREATE INDEX IF NOT EXISTS idx_reconciliation_facility_month ON payment_reconciliation(facility_id, month);

-- =============================================================================
-- 5. IDEMPOTENCY CACHE
-- =============================================================================

-- Idempotency key tracking to prevent duplicate payments
CREATE TABLE IF NOT EXISTS payment_idempotency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key UUID UNIQUE NOT NULL,
  facility_id UUID NOT NULL,
  request_hash VARCHAR(64) NOT NULL,
  response_data JSONB,
  response_status INTEGER,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-cleanup expired keys
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON payment_idempotency(expires_at);

-- =============================================================================
-- 6. PAYMENT STATE MACHINE
-- =============================================================================

-- Payment state transitions tracking
CREATE TABLE IF NOT EXISTS payment_state_transitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES facility_invoice_payments(id),
  from_state VARCHAR(20),
  to_state VARCHAR(20) NOT NULL,
  transition_reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);

-- Index for payment state history
CREATE INDEX IF NOT EXISTS idx_state_transitions_payment ON payment_state_transitions(payment_id, timestamp);

-- =============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all billing tables
ALTER TABLE billing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_state_transitions ENABLE ROW LEVEL SECURITY;

-- Audit log policies
CREATE POLICY "billing_audit_log_facility_access" ON billing_audit_log
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('facility', 'admin', 'dispatcher')
  )
);

-- Payment reconciliation policies
CREATE POLICY "payment_reconciliation_facility_access" ON payment_reconciliation
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('admin', 'dispatcher') OR profiles.facility_id = payment_reconciliation.facility_id)
  )
);

-- Idempotency policies
CREATE POLICY "payment_idempotency_facility_access" ON payment_idempotency
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role IN ('admin', 'dispatcher') OR profiles.facility_id = payment_idempotency.facility_id)
  )
);

-- State transition policies
CREATE POLICY "payment_state_transitions_access" ON payment_state_transitions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('facility', 'admin', 'dispatcher')
  )
);

-- =============================================================================
-- 8. TRIGGERS FOR AUDIT TRAIL
-- =============================================================================

-- Function to log payment changes
CREATE OR REPLACE FUNCTION log_payment_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO billing_audit_log (
    user_id, action, entity_type, entity_id, changes, metadata
  ) VALUES (
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'PAYMENT_CREATED'
      WHEN TG_OP = 'UPDATE' THEN 'PAYMENT_UPDATED'
      WHEN TG_OP = 'DELETE' THEN 'PAYMENT_DELETED'
    END,
    'facility_invoice_payment',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'before', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
      'after', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    ),
    jsonb_build_object(
      'table', 'facility_invoice_payments',
      'operation', TG_OP,
      'timestamp', NOW()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for payment audit trail
DROP TRIGGER IF EXISTS trigger_payment_audit ON facility_invoice_payments;
CREATE TRIGGER trigger_payment_audit
  AFTER INSERT OR UPDATE OR DELETE ON facility_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION log_payment_change();

-- =============================================================================
-- 9. UTILITY FUNCTIONS
-- =============================================================================

-- Function to generate payment hash for verification
CREATE OR REPLACE FUNCTION generate_payment_hash(
  p_facility_id UUID,
  p_trip_ids UUID[],
  p_amount DECIMAL,
  p_timestamp TIMESTAMP
)
RETURNS VARCHAR(64) AS $$
BEGIN
  RETURN encode(
    digest(
      p_facility_id::text || 
      array_to_string(p_trip_ids, ',') || 
      p_amount::text || 
      extract(epoch from p_timestamp)::text,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to lock trips for payment processing
CREATE OR REPLACE FUNCTION lock_trips_for_payment(
  p_trip_ids UUID[],
  p_user_id UUID
)
RETURNS TABLE(locked_count INTEGER, failed_count INTEGER) AS $$
DECLARE
  v_locked_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  -- Update trips that are not already locked
  UPDATE trips 
  SET 
    payment_lock = true,
    payment_lock_timestamp = NOW(),
    payment_lock_user = p_user_id
  WHERE 
    id = ANY(p_trip_ids) 
    AND (payment_lock = false OR payment_lock IS NULL);
  
  GET DIAGNOSTICS v_locked_count = ROW_COUNT;
  
  -- Count failed locks
  SELECT array_length(p_trip_ids, 1) - v_locked_count INTO v_failed_count;
  
  RETURN QUERY SELECT v_locked_count, v_failed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock trips after payment processing
CREATE OR REPLACE FUNCTION unlock_trips_after_payment(
  p_trip_ids UUID[],
  p_payment_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_unlocked_count INTEGER := 0;
BEGIN
  UPDATE trips 
  SET 
    payment_lock = false,
    payment_lock_timestamp = NULL,
    payment_lock_user = NULL,
    last_payment_id = COALESCE(p_payment_id, last_payment_id)
  WHERE id = ANY(p_trip_ids);
  
  GET DIAGNOSTICS v_unlocked_count = ROW_COUNT;
  
  RETURN v_unlocked_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 10. CLEANUP FUNCTIONS
-- =============================================================================

-- Function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  DELETE FROM payment_idempotency WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old audit logs (keep 2 years)
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
BEGIN
  -- In a real implementation, you'd move to an archive table
  -- For now, we'll keep all logs but this shows the structure
  SELECT COUNT(*) INTO v_archived_count 
  FROM billing_audit_log 
  WHERE timestamp < NOW() - INTERVAL '2 years';
  
  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SYSTEM NOTES
-- =============================================================================

-- This schema provides:
-- 1. Complete audit trail for all payment operations
-- 2. Payment locking mechanism to prevent double billing
-- 3. Idempotency keys for duplicate request prevention
-- 4. Payment verification with cryptographic hashes
-- 5. Reconciliation tracking for financial accuracy
-- 6. State machine for payment status transitions
-- 7. Row Level Security for multi-tenant access control
-- 8. Utility functions for common operations
-- 9. Automated cleanup for maintenance

-- Next Phase: Implement application-level integration
-- - API middleware for idempotency
-- - Payment verification service
-- - Reconciliation engine
-- - Monitoring and alerting system