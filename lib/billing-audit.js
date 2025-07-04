/**
 * Professional Billing Audit System
 * Enterprise-grade audit trail and payment integrity
 * Phase 1: Core Implementation
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use service role for audit operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Audit Logger - Comprehensive tracking of all billing operations
 */
export class BillingAuditLogger {
  constructor(userId, sessionId = null, requestId = null) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.requestId = requestId || crypto.randomUUID();
    this.correlationId = crypto.randomUUID();
  }

  async log(action, entityType, entityId, changes = null, metadata = {}) {
    try {
      const auditEntry = {
        user_id: this.userId,
        session_id: this.sessionId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes,
        metadata: {
          ...metadata,
          request_id: this.requestId,
          correlation_id: this.correlationId,
          timestamp: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('billing_audit_log')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to log audit entry:', error);
        throw error;
      }

      return auditEntry;
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failures shouldn't break business operations
      return null;
    }
  }

  async logPaymentInitiated(facilityId, amount, tripIds, paymentMethod) {
    return this.log('PAYMENT_INITIATED', 'facility_invoice_payment', facilityId, {
      amount,
      trip_count: tripIds.length,
      payment_method: paymentMethod
    }, {
      trip_ids: tripIds,
      business_context: 'facility_billing'
    });
  }

  async logPaymentCompleted(paymentId, amount, status, transactionDetails = {}) {
    return this.log('PAYMENT_COMPLETED', 'facility_invoice_payment', paymentId, {
      amount,
      status,
      transaction_details: transactionDetails
    });
  }

  async logPaymentFailed(paymentId, amount, errorReason, errorDetails = {}) {
    return this.log('PAYMENT_FAILED', 'facility_invoice_payment', paymentId, {
      amount,
      error_reason: errorReason,
      error_details: errorDetails
    });
  }

  async logReconciliation(facilityId, month, expectedAmount, actualAmount, discrepancy) {
    return this.log('RECONCILIATION_PERFORMED', 'payment_reconciliation', facilityId, {
      month,
      expected_amount: expectedAmount,
      actual_amount: actualAmount,
      discrepancy
    });
  }
}

/**
 * Payment Integrity Manager - Ensures payment consistency and prevents double billing
 */
export class PaymentIntegrityManager {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
  }

  /**
   * Generate cryptographic hash for payment verification
   */
  generatePaymentHash(facilityId, tripIds, amount, timestamp = new Date()) {
    const data = `${facilityId}:${tripIds.sort().join(',')}:${amount}:${timestamp.getTime()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate idempotency key for duplicate prevention
   */
  generateIdempotencyKey() {
    return crypto.randomUUID();
  }

  /**
   * Check if payment request is duplicate using idempotency key
   */
  async checkIdempotency(idempotencyKey, facilityId, requestHash) {
    try {
      const { data, error } = await supabase
        .from('payment_idempotency')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .eq('facility_id', facilityId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      return data; // Returns cached response if duplicate
    } catch (error) {
      await this.auditLogger?.log('IDEMPOTENCY_CHECK_FAILED', 'payment_idempotency', facilityId, {
        idempotency_key: idempotencyKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Store idempotency cache for duplicate prevention
   */
  async storeIdempotency(idempotencyKey, facilityId, requestHash, responseData, responseStatus) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour expiry

      const { error } = await supabase
        .from('payment_idempotency')
        .insert({
          idempotency_key: idempotencyKey,
          facility_id: facilityId,
          request_hash: requestHash,
          response_data: responseData,
          response_status: responseStatus,
          expires_at: expiresAt.toISOString()
        });

      if (error) throw error;

      await this.auditLogger?.log('IDEMPOTENCY_STORED', 'payment_idempotency', facilityId, {
        idempotency_key: idempotencyKey,
        expires_at: expiresAt.toISOString()
      });
    } catch (error) {
      console.error('Failed to store idempotency:', error);
      // Don't throw - this is for optimization, not critical
    }
  }

  /**
   * Lock trips for payment processing to prevent double billing
   */
  async lockTripsForPayment(tripIds, userId) {
    try {
      const { data, error } = await supabase
        .rpc('lock_trips_for_payment', {
          p_trip_ids: tripIds,
          p_user_id: userId
        });

      if (error) throw error;

      const result = data[0];
      await this.auditLogger?.log('TRIPS_LOCKED_FOR_PAYMENT', 'trips', null, {
        trip_ids: tripIds,
        locked_count: result.locked_count,
        failed_count: result.failed_count
      });

      if (result.failed_count > 0) {
        throw new Error(`Failed to lock ${result.failed_count} trips. They may already be in payment processing.`);
      }

      return result;
    } catch (error) {
      await this.auditLogger?.log('TRIP_LOCKING_FAILED', 'trips', null, {
        trip_ids: tripIds,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Unlock trips after payment processing
   */
  async unlockTripsAfterPayment(tripIds, paymentId = null) {
    try {
      const { data, error } = await supabase
        .rpc('unlock_trips_after_payment', {
          p_trip_ids: tripIds,
          p_payment_id: paymentId
        });

      if (error) throw error;

      await this.auditLogger?.log('TRIPS_UNLOCKED_AFTER_PAYMENT', 'trips', null, {
        trip_ids: tripIds,
        payment_id: paymentId,
        unlocked_count: data
      });

      return data;
    } catch (error) {
      await this.auditLogger?.log('TRIP_UNLOCKING_FAILED', 'trips', null, {
        trip_ids: tripIds,
        payment_id: paymentId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify payment integrity using cryptographic hash
   */
  async verifyPaymentIntegrity(paymentId) {
    try {
      const { data: payment, error } = await supabase
        .from('facility_invoice_payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      if (!payment.payment_hash || !payment.trip_ids) {
        return { verified: false, reason: 'Missing hash or trip IDs' };
      }

      // Regenerate hash with stored data
      const expectedHash = this.generatePaymentHash(
        payment.facility_id,
        payment.trip_ids,
        payment.amount,
        new Date(payment.created_at)
      );

      const verified = payment.payment_hash === expectedHash;

      await this.auditLogger?.log('PAYMENT_INTEGRITY_VERIFIED', 'facility_invoice_payment', paymentId, {
        verified,
        expected_hash: expectedHash,
        stored_hash: payment.payment_hash
      });

      return { verified, expectedHash, storedHash: payment.payment_hash };
    } catch (error) {
      await this.auditLogger?.log('PAYMENT_INTEGRITY_CHECK_FAILED', 'facility_invoice_payment', paymentId, {
        error: error.message
      });
      throw error;
    }
  }
}

/**
 * Payment State Manager - Tracks payment status transitions
 */
export class PaymentStateManager {
  constructor(auditLogger) {
    this.auditLogger = auditLogger;
  }

  async transitionPaymentState(paymentId, fromState, toState, reason, metadata = {}) {
    try {
      // Record state transition
      const { error: transitionError } = await supabase
        .from('payment_state_transitions')
        .insert({
          payment_id: paymentId,
          from_state: fromState,
          to_state: toState,
          transition_reason: reason,
          user_id: this.auditLogger?.userId,
          metadata
        });

      if (transitionError) throw transitionError;

      // Update payment record
      const { error: updateError } = await supabase
        .from('facility_invoice_payments')
        .update({ verification_status: toState })
        .eq('id', paymentId);

      if (updateError) throw updateError;

      await this.auditLogger?.log('PAYMENT_STATE_TRANSITION', 'facility_invoice_payment', paymentId, {
        from_state: fromState,
        to_state: toState,
        reason,
        metadata
      });

      return true;
    } catch (error) {
      await this.auditLogger?.log('PAYMENT_STATE_TRANSITION_FAILED', 'facility_invoice_payment', paymentId, {
        from_state: fromState,
        to_state: toState,
        error: error.message
      });
      throw error;
    }
  }
}

/**
 * Comprehensive Payment Transaction Manager
 * Orchestrates all payment operations with full audit trail
 */
export class PaymentTransactionManager {
  constructor(userId, sessionId = null) {
    this.auditLogger = new BillingAuditLogger(userId, sessionId);
    this.integrityManager = new PaymentIntegrityManager(this.auditLogger);
    this.stateManager = new PaymentStateManager(this.auditLogger);
  }

  async processPayment(facilityId, tripIds, amount, paymentMethod, paymentData = {}) {
    const idempotencyKey = this.integrityManager.generateIdempotencyKey();
    const requestHash = crypto.createHash('sha256')
      .update(JSON.stringify({ facilityId, tripIds, amount, paymentMethod }))
      .digest('hex');

    let paymentId = null;

    try {
      // 1. Check for duplicate request
      const duplicate = await this.integrityManager.checkIdempotency(
        idempotencyKey, facilityId, requestHash
      );
      if (duplicate) {
        await this.auditLogger.log('DUPLICATE_PAYMENT_PREVENTED', 'facility_invoice_payment', facilityId, {
          idempotency_key: idempotencyKey,
          original_response: duplicate.response_data
        });
        return duplicate.response_data;
      }

      // 2. Lock trips for payment processing
      await this.integrityManager.lockTripsForPayment(tripIds, this.auditLogger.userId);

      // 3. Generate payment hash for verification
      const paymentHash = this.integrityManager.generatePaymentHash(facilityId, tripIds, amount);

      // 4. Log payment initiation
      await this.auditLogger.logPaymentInitiated(facilityId, amount, tripIds, paymentMethod);

      // 5. Create payment record with integrity features
      const { data: payment, error: paymentError } = await supabase
        .from('facility_invoice_payments')
        .insert({
          facility_id: facilityId,
          amount,
          payment_method: paymentMethod,
          status: 'PROCESSING',
          trip_ids: tripIds,
          month: new Date().toISOString().slice(0, 7),
          idempotency_key: idempotencyKey,
          payment_hash: paymentHash,
          verification_status: 'PENDING',
          audit_trail: [{
            action: 'PAYMENT_CREATED',
            timestamp: new Date().toISOString(),
            user_id: this.auditLogger.userId
          }],
          notes: `Payment initiated via ${paymentMethod} for ${tripIds.length} trips`
        })
        .select()
        .single();

      if (paymentError) throw paymentError;
      paymentId = payment.id;

      // 6. Transition to processing state
      await this.stateManager.transitionPaymentState(
        paymentId, 'PENDING', 'PROCESSING', 'Payment processing initiated', paymentData
      );

      // 7. Process payment (this would integrate with actual payment processor)
      const paymentResult = await this.processActualPayment(paymentMethod, amount, paymentData);

      // 8. Update payment based on result
      if (paymentResult.success) {
        await this.stateManager.transitionPaymentState(
          paymentId, 'PROCESSING', 'COMPLETED', 'Payment processed successfully', paymentResult
        );
        
        await this.auditLogger.logPaymentCompleted(paymentId, amount, 'COMPLETED', paymentResult);
      } else {
        await this.stateManager.transitionPaymentState(
          paymentId, 'PROCESSING', 'FAILED', 'Payment processing failed', paymentResult
        );
        
        await this.auditLogger.logPaymentFailed(paymentId, amount, paymentResult.error, paymentResult);
        throw new Error(paymentResult.error);
      }

      // 9. Unlock trips
      await this.integrityManager.unlockTripsAfterPayment(tripIds, paymentId);

      // 10. Store idempotency for duplicate prevention
      const response = { success: true, payment_id: paymentId, amount };
      await this.integrityManager.storeIdempotency(
        idempotencyKey, facilityId, requestHash, response, 200
      );

      return response;

    } catch (error) {
      // Comprehensive error handling with cleanup
      if (paymentId) {
        await this.stateManager.transitionPaymentState(
          paymentId, null, 'FAILED', `Error: ${error.message}`, { error: error.message }
        );
      }

      // Unlock trips if they were locked
      if (tripIds && tripIds.length > 0) {
        try {
          await this.integrityManager.unlockTripsAfterPayment(tripIds, null);
        } catch (unlockError) {
          console.error('Failed to unlock trips after error:', unlockError);
        }
      }

      // Store failed response for idempotency
      const errorResponse = { success: false, error: error.message };
      await this.integrityManager.storeIdempotency(
        idempotencyKey, facilityId, requestHash, errorResponse, 500
      );

      await this.auditLogger.log('PAYMENT_TRANSACTION_FAILED', 'facility_invoice_payment', facilityId, {
        error: error.message,
        payment_id: paymentId,
        trip_ids: tripIds
      });

      throw error;
    }
  }

  async processActualPayment(paymentMethod, amount, paymentData) {
    // Mock implementation - replace with actual payment processor integration
    if (paymentMethod === 'CHECK_PAYMENT') {
      return {
        success: true,
        transaction_id: `CHECK_${Date.now()}`,
        processed_at: new Date().toISOString(),
        amount,
        method: paymentMethod
      };
    }

    // For card payments, integrate with Stripe or other processor
    if (paymentMethod === 'CREDIT_CARD') {
      return {
        success: true,
        transaction_id: `CARD_${Date.now()}`,
        processed_at: new Date().toISOString(),
        amount,
        method: paymentMethod,
        card_last_four: paymentData.card_last_four || '****'
      };
    }

    return { success: false, error: 'Unsupported payment method' };
  }
}

/**
 * Utility functions for maintenance and monitoring
 */
export const BillingUtils = {
  async cleanupExpiredIdempotencyKeys() {
    const { data, error } = await supabase.rpc('cleanup_expired_idempotency_keys');
    if (error) throw error;
    return data;
  },

  async getAuditTrail(entityType, entityId, limit = 100) {
    const { data, error } = await supabase
      .from('billing_audit_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getPaymentIntegrityReport(facilityId, startDate, endDate) {
    const { data, error } = await supabase
      .from('facility_invoice_payments')
      .select('*')
      .eq('facility_id', facilityId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    // Analyze integrity
    const report = {
      total_payments: data.length,
      verified_payments: data.filter(p => p.verification_status === 'VERIFIED').length,
      pending_verification: data.filter(p => p.verification_status === 'PENDING').length,
      failed_payments: data.filter(p => p.verification_status === 'FAILED').length,
      total_amount: data.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    };

    return { payments: data, report };
  }
};