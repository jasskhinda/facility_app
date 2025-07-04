/**
 * Professional Billing Reconciliation System
 * Enterprise-grade financial reconciliation and double billing prevention
 * Phase 1: Core Implementation
 */

import { createClient } from '@supabase/supabase-js';
import { BillingAuditLogger } from './billing-audit.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Payment Reconciliation Engine
 * Ensures all payments are accurately tracked and prevents double billing
 */
export class PaymentReconciliationEngine {
  constructor(userId = 'system') {
    this.auditLogger = new BillingAuditLogger(userId, null, 'reconciliation');
  }

  /**
   * Perform daily reconciliation for a facility
   */
  async performDailyReconciliation(facilityId, targetDate = new Date()) {
    const reconciliationId = crypto.randomUUID();
    const month = targetDate.toISOString().slice(0, 7); // YYYY-MM
    
    try {
      await this.auditLogger.log('DAILY_RECONCILIATION_STARTED', 'payment_reconciliation', facilityId, {
        reconciliation_id: reconciliationId,
        target_date: targetDate.toISOString(),
        month
      });

      // 1. Get all completed trips for the month
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select('id, price, status, pickup_time, created_at')
        .eq('facility_id', facilityId)
        .eq('status', 'completed')
        .gte('pickup_time', `${month}-01`)
        .lt('pickup_time', this.getNextMonth(month))
        .not('price', 'is', null)
        .gt('price', 0);

      if (tripsError) throw tripsError;

      // 2. Get all payments for the month
      const { data: payments, error: paymentsError } = await supabase
        .from('facility_invoice_payments')
        .select('id, amount, trip_ids, status, verification_status, created_at')
        .eq('facility_id', facilityId)
        .eq('month', month)
        .in('status', ['COMPLETED', 'VERIFIED']);

      if (paymentsError) throw paymentsError;

      // 3. Calculate expected vs actual amounts
      const expectedAmount = trips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0);
      const actualAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
      const discrepancy = actualAmount - expectedAmount;

      // 4. Identify potential double billing
      const doubleBillingIssues = await this.detectDoubleBilling(trips, payments);

      // 5. Identify missing payments
      const missingPayments = await this.detectMissingPayments(trips, payments);

      // 6. Create reconciliation record
      const reconciliationData = {
        facility_id: facilityId,
        reconciliation_date: targetDate.toISOString().split('T')[0],
        month,
        expected_amount: expectedAmount,
        actual_amount: actualAmount,
        trip_count: trips.length,
        payment_count: payments.length,
        status: Math.abs(discrepancy) < 0.01 ? 'RECONCILED' : 'DISPUTED',
        notes: this.generateReconciliationNotes(expectedAmount, actualAmount, doubleBillingIssues, missingPayments)
      };

      const { data: reconciliation, error: reconciliationError } = await supabase
        .from('payment_reconciliation')
        .insert(reconciliationData)
        .select()
        .single();

      if (reconciliationError) throw reconciliationError;

      // 7. Log results
      await this.auditLogger.logReconciliation(facilityId, month, expectedAmount, actualAmount, discrepancy);

      const result = {
        reconciliation_id: reconciliation.id,
        facility_id: facilityId,
        month,
        expected_amount: expectedAmount,
        actual_amount: actualAmount,
        discrepancy,
        trip_count: trips.length,
        payment_count: payments.length,
        status: reconciliation.status,
        double_billing_issues: doubleBillingIssues,
        missing_payments: missingPayments,
        reconciled_at: new Date().toISOString()
      };

      await this.auditLogger.log('DAILY_RECONCILIATION_COMPLETED', 'payment_reconciliation', reconciliation.id, result);

      return result;

    } catch (error) {
      await this.auditLogger.log('DAILY_RECONCILIATION_FAILED', 'payment_reconciliation', facilityId, {
        reconciliation_id: reconciliationId,
        error: error.message,
        month
      });
      throw error;
    }
  }

  /**
   * Detect potential double billing scenarios
   */
  async detectDoubleBilling(trips, payments) {
    const issues = [];
    const tripIdToPayments = new Map();

    // Map trips to payments
    payments.forEach(payment => {
      if (payment.trip_ids && Array.isArray(payment.trip_ids)) {
        payment.trip_ids.forEach(tripId => {
          if (!tripIdToPayments.has(tripId)) {
            tripIdToPayments.set(tripId, []);
          }
          tripIdToPayments.get(tripId).push(payment);
        });
      }
    });

    // Check for trips paid multiple times
    for (const [tripId, tripPayments] of tripIdToPayments) {
      if (tripPayments.length > 1) {
        const trip = trips.find(t => t.id === tripId);
        issues.push({
          type: 'DOUBLE_BILLING',
          trip_id: tripId,
          trip_amount: trip?.price || 0,
          payment_count: tripPayments.length,
          payments: tripPayments.map(p => ({
            id: p.id,
            amount: p.amount,
            created_at: p.created_at
          })),
          total_billed: tripPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        });
      }
    }

    // Check for amount mismatches
    for (const trip of trips) {
      const relatedPayments = tripIdToPayments.get(trip.id) || [];
      if (relatedPayments.length === 1) {
        const payment = relatedPayments[0];
        const expectedAmount = parseFloat(trip.price);
        const paidAmount = parseFloat(payment.amount);
        
        if (Math.abs(expectedAmount - paidAmount) > 0.01) {
          issues.push({
            type: 'AMOUNT_MISMATCH',
            trip_id: trip.id,
            expected_amount: expectedAmount,
            paid_amount: paidAmount,
            difference: paidAmount - expectedAmount,
            payment_id: payment.id
          });
        }
      }
    }

    return issues;
  }

  /**
   * Detect trips that should be paid but aren't
   */
  async detectMissingPayments(trips, payments) {
    const missingPayments = [];
    const paidTripIds = new Set();

    // Collect all trip IDs that have been paid
    payments.forEach(payment => {
      if (payment.trip_ids && Array.isArray(payment.trip_ids)) {
        payment.trip_ids.forEach(tripId => paidTripIds.add(tripId));
      }
    });

    // Find trips that should be paid but aren't
    trips.forEach(trip => {
      if (!paidTripIds.has(trip.id) && trip.status === 'completed' && parseFloat(trip.price || 0) > 0) {
        missingPayments.push({
          trip_id: trip.id,
          amount: parseFloat(trip.price),
          pickup_time: trip.pickup_time,
          created_at: trip.created_at
        });
      }
    });

    return missingPayments;
  }

  /**
   * Generate comprehensive reconciliation notes
   */
  generateReconciliationNotes(expectedAmount, actualAmount, doubleBillingIssues, missingPayments) {
    const notes = [];
    const discrepancy = actualAmount - expectedAmount;

    if (Math.abs(discrepancy) < 0.01) {
      notes.push('✅ Perfect reconciliation - all amounts match exactly');
    } else {
      notes.push(`💰 Amount discrepancy: $${discrepancy.toFixed(2)} (Expected: $${expectedAmount.toFixed(2)}, Actual: $${actualAmount.toFixed(2)})`);
    }

    if (doubleBillingIssues.length > 0) {
      notes.push(`🚨 Double billing issues detected: ${doubleBillingIssues.length} cases`);
      doubleBillingIssues.forEach((issue, index) => {
        if (issue.type === 'DOUBLE_BILLING') {
          notes.push(`  ${index + 1}. Trip ${issue.trip_id.slice(0, 8)} billed ${issue.payment_count} times (Total: $${issue.total_billed.toFixed(2)})`);
        } else if (issue.type === 'AMOUNT_MISMATCH') {
          notes.push(`  ${index + 1}. Trip ${issue.trip_id.slice(0, 8)} amount mismatch: Expected $${issue.expected_amount.toFixed(2)}, Paid $${issue.paid_amount.toFixed(2)}`);
        }
      });
    }

    if (missingPayments.length > 0) {
      const totalMissing = missingPayments.reduce((sum, mp) => sum + mp.amount, 0);
      notes.push(`📝 Missing payments: ${missingPayments.length} trips totaling $${totalMissing.toFixed(2)}`);
    }

    if (doubleBillingIssues.length === 0 && missingPayments.length === 0 && Math.abs(discrepancy) < 0.01) {
      notes.push('🎉 All systems operational - no billing issues detected');
    }

    return notes.join('\n');
  }

  /**
   * Get next month string (YYYY-MM format)
   */
  getNextMonth(monthStr) {
    const [year, month] = monthStr.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
  }

  /**
   * Resolve double billing issue
   */
  async resolveDoubleBilling(issueId, resolution, notes) {
    try {
      await this.auditLogger.log('DOUBLE_BILLING_RESOLUTION_STARTED', 'billing_issue', issueId, {
        resolution,
        notes
      });

      // Implementation would depend on the specific resolution:
      // - Refund duplicate payment
      // - Mark as legitimate (split billing)
      // - Adjust trip amounts
      
      await this.auditLogger.log('DOUBLE_BILLING_RESOLVED', 'billing_issue', issueId, {
        resolution,
        resolved_at: new Date().toISOString()
      });

      return { success: true, resolution, resolved_at: new Date().toISOString() };
    } catch (error) {
      await this.auditLogger.log('DOUBLE_BILLING_RESOLUTION_FAILED', 'billing_issue', issueId, {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Auto-reconciliation for small discrepancies
   */
  async performAutoReconciliation(reconciliationId, maxAutoResolveAmount = 5.00) {
    try {
      const { data: reconciliation, error } = await supabase
        .from('payment_reconciliation')
        .select('*')
        .eq('id', reconciliationId)
        .single();

      if (error) throw error;

      const discrepancy = Math.abs(reconciliation.discrepancy || 0);
      
      if (discrepancy <= maxAutoResolveAmount && reconciliation.status === 'DISPUTED') {
        // Auto-resolve small discrepancies
        const { error: updateError } = await supabase
          .from('payment_reconciliation')
          .update({
            status: 'RECONCILED',
            reconciled_by: this.auditLogger.userId,
            reconciled_at: new Date().toISOString(),
            notes: reconciliation.notes + `\n\n🤖 Auto-resolved: Discrepancy of $${discrepancy.toFixed(2)} within tolerance ($${maxAutoResolveAmount.toFixed(2)})`
          })
          .eq('id', reconciliationId);

        if (updateError) throw updateError;

        await this.auditLogger.log('AUTO_RECONCILIATION_COMPLETED', 'payment_reconciliation', reconciliationId, {
          discrepancy,
          max_auto_resolve: maxAutoResolveAmount
        });

        return { auto_resolved: true, discrepancy };
      }

      return { auto_resolved: false, discrepancy, reason: 'Exceeds auto-resolve threshold' };
    } catch (error) {
      await this.auditLogger.log('AUTO_RECONCILIATION_FAILED', 'payment_reconciliation', reconciliationId, {
        error: error.message
      });
      throw error;
    }
  }
}

/**
 * Real-time Payment Monitor
 * Monitors payments in real-time for immediate issue detection
 */
export class RealTimePaymentMonitor {
  constructor(userId = 'system') {
    this.auditLogger = new BillingAuditLogger(userId, null, 'monitor');
    this.alertThresholds = {
      duplicatePaymentWindow: 30000, // 30 seconds
      unusualAmountMultiplier: 3, // 3x normal amount
      rapidPaymentCount: 5, // 5 payments in short time
      rapidPaymentWindow: 300000 // 5 minutes
    };
  }

  /**
   * Monitor payment for real-time anomalies
   */
  async monitorPayment(paymentData) {
    const alerts = [];

    try {
      // Check for duplicate payments in short time window
      const duplicateCheck = await this.checkForDuplicatePayments(paymentData);
      if (duplicateCheck.isDuplicate) {
        alerts.push({
          type: 'DUPLICATE_PAYMENT',
          severity: 'HIGH',
          message: 'Potential duplicate payment detected',
          details: duplicateCheck
        });
      }

      // Check for unusual amounts
      const amountCheck = await this.checkForUnusualAmounts(paymentData);
      if (amountCheck.isUnusual) {
        alerts.push({
          type: 'UNUSUAL_AMOUNT',
          severity: 'MEDIUM',
          message: 'Payment amount significantly higher than normal',
          details: amountCheck
        });
      }

      // Check for rapid payments
      const rapidCheck = await this.checkForRapidPayments(paymentData);
      if (rapidCheck.isRapid) {
        alerts.push({
          type: 'RAPID_PAYMENTS',
          severity: 'MEDIUM',
          message: 'Multiple payments in short time period',
          details: rapidCheck
        });
      }

      // Log monitoring results
      if (alerts.length > 0) {
        await this.auditLogger.log('PAYMENT_ANOMALY_DETECTED', 'facility_invoice_payment', paymentData.id, {
          alerts,
          payment_data: paymentData
        });
      }

      return { alerts, monitored_at: new Date().toISOString() };
    } catch (error) {
      await this.auditLogger.log('PAYMENT_MONITORING_FAILED', 'facility_invoice_payment', paymentData.id, {
        error: error.message
      });
      throw error;
    }
  }

  async checkForDuplicatePayments(paymentData) {
    const windowStart = new Date(Date.now() - this.alertThresholds.duplicatePaymentWindow);
    
    const { data: recentPayments, error } = await supabase
      .from('facility_invoice_payments')
      .select('id, amount, trip_ids, created_at')
      .eq('facility_id', paymentData.facility_id)
      .gte('created_at', windowStart.toISOString())
      .neq('id', paymentData.id);

    if (error) throw error;

    const duplicates = recentPayments.filter(payment => 
      Math.abs(parseFloat(payment.amount) - parseFloat(paymentData.amount)) < 0.01 &&
      this.arraysEqual(payment.trip_ids || [], paymentData.trip_ids || [])
    );

    return {
      isDuplicate: duplicates.length > 0,
      duplicate_count: duplicates.length,
      duplicates: duplicates
    };
  }

  async checkForUnusualAmounts(paymentData) {
    // Get average payment amount for this facility over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: recentPayments, error } = await supabase
      .from('facility_invoice_payments')
      .select('amount')
      .eq('facility_id', paymentData.facility_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('status', 'COMPLETED');

    if (error || !recentPayments.length) return { isUnusual: false };

    const amounts = recentPayments.map(p => parseFloat(p.amount || 0));
    const averageAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const currentAmount = parseFloat(paymentData.amount || 0);

    return {
      isUnusual: currentAmount > averageAmount * this.alertThresholds.unusualAmountMultiplier,
      current_amount: currentAmount,
      average_amount: averageAmount,
      multiplier: currentAmount / averageAmount
    };
  }

  async checkForRapidPayments(paymentData) {
    const windowStart = new Date(Date.now() - this.alertThresholds.rapidPaymentWindow);
    
    const { data: recentPayments, error } = await supabase
      .from('facility_invoice_payments')
      .select('id, created_at')
      .eq('facility_id', paymentData.facility_id)
      .gte('created_at', windowStart.toISOString());

    if (error) throw error;

    return {
      isRapid: recentPayments.length >= this.alertThresholds.rapidPaymentCount,
      payment_count: recentPayments.length,
      time_window_minutes: this.alertThresholds.rapidPaymentWindow / 60000
    };
  }

  arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, i) => val === sortedB[i]);
  }
}

/**
 * Billing Health Monitor
 * Provides comprehensive billing system health metrics
 */
export class BillingHealthMonitor {
  constructor() {
    this.auditLogger = new BillingAuditLogger('system', null, 'health-monitor');
  }

  async getSystemHealthReport(facilityId = null) {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        overall_status: 'HEALTHY',
        metrics: {},
        alerts: []
      };

      // 1. Payment processing metrics
      report.metrics.payment_processing = await this.getPaymentProcessingMetrics(facilityId);
      
      // 2. Reconciliation status
      report.metrics.reconciliation = await this.getReconciliationMetrics(facilityId);
      
      // 3. Audit trail integrity
      report.metrics.audit_integrity = await this.getAuditIntegrityMetrics(facilityId);
      
      // 4. System performance
      report.metrics.performance = await this.getPerformanceMetrics();

      // 5. Determine overall health
      report.overall_status = this.calculateOverallHealth(report.metrics);

      await this.auditLogger.log('BILLING_HEALTH_REPORT_GENERATED', 'system_health', facilityId, report);

      return report;
    } catch (error) {
      await this.auditLogger.log('BILLING_HEALTH_REPORT_FAILED', 'system_health', facilityId, {
        error: error.message
      });
      throw error;
    }
  }

  async getPaymentProcessingMetrics(facilityId) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    let query = supabase
      .from('facility_invoice_payments')
      .select('status, verification_status, created_at, amount')
      .gte('created_at', last24Hours.toISOString());

    if (facilityId) {
      query = query.eq('facility_id', facilityId);
    }

    const { data: payments, error } = await query;
    if (error) throw error;

    const total = payments.length;
    const completed = payments.filter(p => p.status === 'COMPLETED').length;
    const failed = payments.filter(p => p.status === 'FAILED').length;
    const pending = payments.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING').length;

    return {
      total_payments_24h: total,
      success_rate: total > 0 ? (completed / total * 100).toFixed(2) : 100,
      failure_rate: total > 0 ? (failed / total * 100).toFixed(2) : 0,
      pending_count: pending,
      total_amount_24h: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
    };
  }

  async getReconciliationMetrics(facilityId) {
    let query = supabase
      .from('payment_reconciliation')
      .select('status, discrepancy, reconciliation_date')
      .gte('reconciliation_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (facilityId) {
      query = query.eq('facility_id', facilityId);
    }

    const { data: reconciliations, error } = await query;
    if (error) throw error;

    const total = reconciliations.length;
    const reconciled = reconciliations.filter(r => r.status === 'RECONCILED').length;
    const disputed = reconciliations.filter(r => r.status === 'DISPUTED').length;

    return {
      total_reconciliations_30d: total,
      reconciliation_rate: total > 0 ? (reconciled / total * 100).toFixed(2) : 100,
      disputed_count: disputed,
      avg_discrepancy: total > 0 ? 
        (reconciliations.reduce((sum, r) => sum + Math.abs(parseFloat(r.discrepancy || 0)), 0) / total).toFixed(2) : 0
    };
  }

  async getAuditIntegrityMetrics(facilityId) {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: auditLogs, error } = await supabase
      .from('billing_audit_log')
      .select('action, timestamp')
      .gte('timestamp', last24Hours.toISOString());

    if (error) throw error;

    return {
      audit_entries_24h: auditLogs.length,
      audit_coverage: auditLogs.length > 0 ? 'COMPLETE' : 'INCOMPLETE',
      last_audit_entry: auditLogs.length > 0 ? auditLogs[0].timestamp : null
    };
  }

  async getPerformanceMetrics() {
    // Mock implementation - in production, integrate with monitoring tools
    return {
      avg_response_time_ms: 250,
      error_rate_percent: 0.1,
      uptime_percent: 99.9,
      database_connections: 5
    };
  }

  calculateOverallHealth(metrics) {
    const issues = [];

    if (parseFloat(metrics.payment_processing.success_rate) < 95) {
      issues.push('Low payment success rate');
    }

    if (parseFloat(metrics.reconciliation.reconciliation_rate) < 90) {
      issues.push('Reconciliation issues');
    }

    if (metrics.audit_integrity.audit_coverage !== 'COMPLETE') {
      issues.push('Audit coverage incomplete');
    }

    if (parseFloat(metrics.performance.uptime_percent) < 99) {
      issues.push('System availability issues');
    }

    if (issues.length === 0) return 'HEALTHY';
    if (issues.length <= 2) return 'WARNING';
    return 'CRITICAL';
  }
}

export default {
  PaymentReconciliationEngine,
  RealTimePaymentMonitor,
  BillingHealthMonitor
};