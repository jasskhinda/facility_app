# Professional Billing System Architecture
## CCT APPS - Facility Billing Module

### Overview
This document outlines the enterprise-grade billing system architecture for facility transportation billing, designed to handle high-volume transactions with zero tolerance for billing errors.

---

## 🏗️ System Architecture

### 1. **Data Integrity Layer**

#### 1.1 Immutable Payment Records
- Every payment creates an immutable record in `facility_invoice_payments`
- No UPDATE operations allowed on payment records - only INSERT
- All modifications create new records with references to previous states

#### 1.2 Trip State Management
```
Trip Lifecycle States:
- PENDING → COMPLETED → DUE → INVOICED → PAID
- Each state transition is logged with timestamp and user ID
- State transitions are irreversible without audit trail
```

#### 1.3 Payment Verification
- Each payment includes:
  - `payment_hash`: SHA-256 hash of (facility_id + trip_ids + amount + timestamp)
  - `verification_status`: PENDING → VERIFIED → RECONCILED
  - `audit_trail`: JSON array of all state changes

### 2. **Double Billing Prevention**

#### 2.1 Trip Locking Mechanism
```sql
-- Before payment processing
UPDATE trips 
SET payment_lock = true, 
    payment_lock_timestamp = NOW(),
    payment_lock_user = current_user_id
WHERE id IN (trip_ids) 
AND payment_lock = false;
```

#### 2.2 Idempotency Keys
- Each payment request includes unique idempotency key
- Duplicate requests with same key return cached response
- Keys expire after 24 hours

#### 2.3 Payment Reconciliation
- Daily automated reconciliation job
- Compares: trip_amounts ↔ payment_amounts ↔ invoice_totals
- Alerts on any discrepancies

### 3. **Audit Trail System**

#### 3.1 Comprehensive Logging
```javascript
const auditLog = {
  timestamp: new Date().toISOString(),
  user_id: currentUser.id,
  action: 'PAYMENT_INITIATED',
  entity_type: 'facility_invoice',
  entity_id: invoiceId,
  changes: {
    before: previousState,
    after: newState
  },
  metadata: {
    ip_address: request.ip,
    user_agent: request.headers['user-agent'],
    session_id: session.id
  }
};
```

#### 3.2 Payment History
- Complete payment history with all attempts
- Failed payment reasons tracked
- Reversal/refund tracking with reasons

### 4. **Error Handling & Recovery**

#### 4.1 Transaction Rollback
```javascript
const db = await supabase.transaction();
try {
  // Payment processing steps
  await db.commit();
} catch (error) {
  await db.rollback();
  // Log error and notify
}
```

#### 4.2 Payment State Machine
```
States:
INITIATED → PROCESSING → COMPLETED → VERIFIED
         ↓            ↓            ↓
      FAILED      FAILED       DISPUTED
```

### 5. **Reporting & Analytics**

#### 5.1 Real-time Dashboards
- Payment status by facility
- Outstanding balances
- Payment velocity metrics
- Failed payment analysis

#### 5.2 Automated Reports
- Daily reconciliation reports
- Monthly billing summaries
- Exception reports for manual review
- Audit compliance reports

### 6. **Security Measures**

#### 6.1 Access Control
- Role-based permissions for billing operations
- Two-factor authentication for payment processing
- IP whitelisting for administrative functions

#### 6.2 Data Encryption
- All payment data encrypted at rest
- TLS 1.3 for data in transit
- PCI compliance for card payments

### 7. **Monitoring & Alerts**

#### 7.1 Real-time Monitoring
- Payment processing latency
- Error rates by payment method
- Database query performance
- API endpoint health

#### 7.2 Alert Conditions
- Failed payments > threshold
- Duplicate payment attempts
- Unusual payment patterns
- System performance degradation

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Immediate)
- [ ] Implement idempotency keys
- [ ] Add payment locking mechanism
- [ ] Create audit log tables
- [ ] Add transaction rollback support

### Phase 2: Verification (Week 1)
- [ ] Payment hash generation
- [ ] Reconciliation engine
- [ ] Automated verification jobs
- [ ] Exception handling

### Phase 3: Reporting (Week 2)
- [ ] Real-time dashboards
- [ ] Automated reports
- [ ] Alert system
- [ ] Performance monitoring

### Phase 4: Compliance (Week 3)
- [ ] Security audit
- [ ] Load testing
- [ ] Disaster recovery plan
- [ ] Documentation completion

---

## 🚨 Critical Success Factors

1. **Zero Tolerance for Billing Errors**
   - All payments must be accurately tracked
   - No trip can be billed twice
   - All amounts must reconcile

2. **Complete Audit Trail**
   - Every action must be logged
   - All changes must be traceable
   - Reports must be defensible

3. **High Availability**
   - 99.9% uptime for billing system
   - Graceful degradation
   - Automatic failover

4. **Scalability**
   - Handle 10,000+ trips per month
   - Sub-second payment processing
   - Efficient database queries

---

## 🔧 Technical Implementation

### Database Schema Enhancements

```sql
-- Add to facility_invoice_payments
ALTER TABLE facility_invoice_payments ADD COLUMN IF NOT EXISTS
  idempotency_key UUID UNIQUE,
  payment_hash VARCHAR(64),
  verification_status VARCHAR(20) DEFAULT 'PENDING',
  audit_trail JSONB DEFAULT '[]',
  reconciled_at TIMESTAMP,
  reconciliation_notes TEXT;

-- Create audit log table
CREATE TABLE billing_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create payment reconciliation table
CREATE TABLE payment_reconciliation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL,
  expected_amount DECIMAL(10,2),
  actual_amount DECIMAL(10,2),
  discrepancy DECIMAL(10,2),
  status VARCHAR(20),
  notes TEXT,
  reconciled_by UUID,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payments_facility_month ON facility_invoice_payments(facility_id, month);
CREATE INDEX idx_audit_log_entity ON billing_audit_log(entity_type, entity_id);
CREATE INDEX idx_reconciliation_status ON payment_reconciliation(status, month);
```

### API Enhancements

```javascript
// Idempotency middleware
const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency key required' });
  }
  
  // Check for existing response
  const cached = await getCachedResponse(idempotencyKey);
  if (cached) {
    return res.status(cached.status).json(cached.response);
  }
  
  // Proceed with request
  next();
};

// Payment verification
const verifyPayment = async (paymentData) => {
  const hash = generatePaymentHash(paymentData);
  const verified = await verifyWithBank(paymentData);
  const reconciled = await reconcileWithTrips(paymentData);
  
  return {
    hash,
    verified,
    reconciled,
    timestamp: new Date().toISOString()
  };
};
```

---

## 📞 Support & Escalation

### Level 1: Automated Monitoring
- System alerts for anomalies
- Automated reconciliation
- Self-healing for known issues

### Level 2: Operations Team
- Manual reconciliation
- Payment dispute resolution
- System performance issues

### Level 3: Engineering Team
- Code-level debugging
- Database optimization
- Architecture changes

### Emergency Contacts
- On-call Engineer: (rotation schedule)
- Database Admin: (24/7 support)
- Security Team: (incident response)

---

**Document Version**: 1.0
**Last Updated**: ${new Date().toISOString()}
**Approved By**: [Pending]