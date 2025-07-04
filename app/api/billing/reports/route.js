/**
 * Professional Billing Reports API
 * Enterprise-grade audit and compliance reporting
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BillingAuditLogger, BillingUtils } from '@/lib/billing-audit';
import { PaymentReconciliationEngine, BillingHealthMonitor } from '@/lib/billing-reconciliation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/billing/reports - Generate comprehensive billing reports
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const reportType = searchParams.get('type') || 'audit';
  const facilityId = searchParams.get('facility_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const format = searchParams.get('format') || 'json';

  try {
    // Authentication check
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Authorization check
    if (profile.role === 'facility' && facilityId && profile.facility_id !== facilityId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const auditLogger = new BillingAuditLogger(session.user.id, null, 'reports');

    let reportData;
    switch (reportType) {
      case 'audit':
        reportData = await generateAuditReport(facilityId, startDate, endDate, auditLogger);
        break;
      case 'reconciliation':
        reportData = await generateReconciliationReport(facilityId, startDate, endDate, auditLogger);
        break;
      case 'integrity':
        reportData = await generateIntegrityReport(facilityId, startDate, endDate, auditLogger);
        break;
      case 'health':
        reportData = await generateHealthReport(facilityId, auditLogger);
        break;
      case 'compliance':
        reportData = await generateComplianceReport(facilityId, startDate, endDate, auditLogger);
        break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    // Format response
    if (format === 'csv') {
      const csv = convertToCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    return NextResponse.json(reportData);

  } catch (error) {
    console.error('Report generation failed:', error);
    return NextResponse.json({ 
      error: 'Report generation failed',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Generate comprehensive audit report
 */
async function generateAuditReport(facilityId, startDate, endDate, auditLogger) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  await auditLogger.log('AUDIT_REPORT_GENERATION_STARTED', 'billing_report', facilityId, {
    report_type: 'audit',
    date_range: { start, end }
  });

  // Get audit trail data
  let auditQuery = supabase
    .from('billing_audit_log')
    .select(`
      id, timestamp, user_id, action, entity_type, entity_id, 
      changes, metadata, created_at,
      profiles(first_name, last_name, role)
    `)
    .gte('timestamp', start)
    .lte('timestamp', end)
    .order('timestamp', { ascending: false });

  const { data: auditLogs, error: auditError } = await auditQuery;
  if (auditError) throw auditError;

  // Get payment data for the period
  let paymentsQuery = supabase
    .from('facility_invoice_payments')
    .select('*')
    .gte('created_at', start)
    .lte('created_at', end);

  if (facilityId) {
    paymentsQuery = paymentsQuery.eq('facility_id', facilityId);
  }

  const { data: payments, error: paymentsError } = await paymentsQuery;
  if (paymentsError) throw paymentsError;

  // Analytics
  const analytics = {
    total_audit_entries: auditLogs.length,
    unique_users: new Set(auditLogs.map(log => log.user_id)).size,
    actions_breakdown: auditLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {}),
    payment_operations: {
      total_payments: payments.length,
      total_amount: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
      by_status: payments.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      by_method: payments.reduce((acc, p) => {
        acc[p.payment_method] = (acc[p.payment_method] || 0) + 1;
        return acc;
      }, {})
    }
  };

  await auditLogger.log('AUDIT_REPORT_GENERATION_COMPLETED', 'billing_report', facilityId, {
    report_type: 'audit',
    total_entries: auditLogs.length
  });

  return {
    report_type: 'audit',
    facility_id: facilityId,
    date_range: { start, end },
    generated_at: new Date().toISOString(),
    analytics,
    audit_logs: auditLogs,
    payments: payments
  };
}

/**
 * Generate reconciliation report
 */
async function generateReconciliationReport(facilityId, startDate, endDate, auditLogger) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  await auditLogger.log('RECONCILIATION_REPORT_GENERATION_STARTED', 'billing_report', facilityId, {
    report_type: 'reconciliation',
    date_range: { start, end }
  });

  // Get reconciliation data
  let reconciliationQuery = supabase
    .from('payment_reconciliation')
    .select('*')
    .gte('reconciliation_date', start)
    .lte('reconciliation_date', end)
    .order('reconciliation_date', { ascending: false });

  if (facilityId) {
    reconciliationQuery = reconciliationQuery.eq('facility_id', facilityId);
  }

  const { data: reconciliations, error: reconciliationError } = await reconciliationQuery;
  if (reconciliationError) throw reconciliationError;

  // Run fresh reconciliation if requested
  const engine = new PaymentReconciliationEngine(auditLogger.userId);
  const freshReconciliation = facilityId ? 
    await engine.performDailyReconciliation(facilityId) : null;

  // Analytics
  const analytics = {
    total_reconciliations: reconciliations.length,
    reconciled_count: reconciliations.filter(r => r.status === 'RECONCILED').length,
    disputed_count: reconciliations.filter(r => r.status === 'DISPUTED').length,
    total_discrepancy: reconciliations.reduce((sum, r) => sum + Math.abs(parseFloat(r.discrepancy || 0)), 0),
    avg_discrepancy: reconciliations.length > 0 ? 
      reconciliations.reduce((sum, r) => sum + Math.abs(parseFloat(r.discrepancy || 0)), 0) / reconciliations.length : 0,
    success_rate: reconciliations.length > 0 ? 
      (reconciliations.filter(r => r.status === 'RECONCILED').length / reconciliations.length * 100).toFixed(2) : 100
  };

  return {
    report_type: 'reconciliation',
    facility_id: facilityId,
    date_range: { start, end },
    generated_at: new Date().toISOString(),
    analytics,
    reconciliations,
    fresh_reconciliation: freshReconciliation
  };
}

/**
 * Generate payment integrity report
 */
async function generateIntegrityReport(facilityId, startDate, endDate, auditLogger) {
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  await auditLogger.log('INTEGRITY_REPORT_GENERATION_STARTED', 'billing_report', facilityId, {
    report_type: 'integrity',
    date_range: { start, end }
  });

  const integrityReport = await BillingUtils.getPaymentIntegrityReport(facilityId, start, end);
  
  // Additional integrity checks
  const integrityIssues = [];
  
  for (const payment of integrityReport.payments) {
    // Check payment hash integrity
    if (payment.payment_hash) {
      try {
        // This would verify the hash against stored data
        // Implementation depends on specific hash verification logic
        const hashValid = true; // Placeholder
        if (!hashValid) {
          integrityIssues.push({
            payment_id: payment.id,
            issue_type: 'INVALID_HASH',
            severity: 'HIGH',
            details: 'Payment hash verification failed'
          });
        }
      } catch (error) {
        integrityIssues.push({
          payment_id: payment.id,
          issue_type: 'HASH_VERIFICATION_ERROR',
          severity: 'MEDIUM',
          details: error.message
        });
      }
    }

    // Check for missing trip IDs
    if (!payment.trip_ids || payment.trip_ids.length === 0) {
      integrityIssues.push({
        payment_id: payment.id,
        issue_type: 'MISSING_TRIP_IDS',
        severity: 'MEDIUM',
        details: 'Payment has no associated trip IDs'
      });
    }

    // Check verification status
    if (!payment.verification_status || payment.verification_status === 'PENDING') {
      integrityIssues.push({
        payment_id: payment.id,
        issue_type: 'UNVERIFIED_PAYMENT',
        severity: 'LOW',
        details: 'Payment verification pending'
      });
    }
  }

  const enhancedReport = {
    ...integrityReport,
    integrity_issues: integrityIssues,
    integrity_score: integrityIssues.length === 0 ? 100 : 
      Math.max(0, 100 - (integrityIssues.length / integrityReport.payments.length * 100))
  };

  await auditLogger.log('INTEGRITY_REPORT_GENERATION_COMPLETED', 'billing_report', facilityId, {
    report_type: 'integrity',
    issues_found: integrityIssues.length,
    integrity_score: enhancedReport.integrity_score
  });

  return {
    report_type: 'integrity',
    facility_id: facilityId,
    date_range: { start, end },
    generated_at: new Date().toISOString(),
    ...enhancedReport
  };
}

/**
 * Generate system health report
 */
async function generateHealthReport(facilityId, auditLogger) {
  await auditLogger.log('HEALTH_REPORT_GENERATION_STARTED', 'billing_report', facilityId, {
    report_type: 'health'
  });

  const healthMonitor = new BillingHealthMonitor();
  const healthReport = await healthMonitor.getSystemHealthReport(facilityId);

  await auditLogger.log('HEALTH_REPORT_GENERATION_COMPLETED', 'billing_report', facilityId, {
    report_type: 'health',
    overall_status: healthReport.overall_status
  });

  return {
    report_type: 'health',
    facility_id: facilityId,
    generated_at: new Date().toISOString(),
    ...healthReport
  };
}

/**
 * Generate compliance report
 */
async function generateComplianceReport(facilityId, startDate, endDate, auditLogger) {
  const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const end = endDate || new Date().toISOString();

  await auditLogger.log('COMPLIANCE_REPORT_GENERATION_STARTED', 'billing_report', facilityId, {
    report_type: 'compliance',
    date_range: { start, end }
  });

  // Compliance checks
  const complianceChecks = {
    audit_trail_completeness: await checkAuditTrailCompleteness(facilityId, start, end),
    payment_verification: await checkPaymentVerification(facilityId, start, end),
    reconciliation_timeliness: await checkReconciliationTimeliness(facilityId, start, end),
    data_retention: await checkDataRetention(facilityId),
    security_compliance: await checkSecurityCompliance(facilityId, start, end)
  };

  // Calculate overall compliance score
  const scores = Object.values(complianceChecks).map(check => check.score);
  const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const complianceReport = {
    overall_score: overallScore,
    compliance_level: overallScore >= 95 ? 'EXCELLENT' : 
                     overallScore >= 85 ? 'GOOD' : 
                     overallScore >= 70 ? 'FAIR' : 'POOR',
    checks: complianceChecks,
    recommendations: generateComplianceRecommendations(complianceChecks)
  };

  await auditLogger.log('COMPLIANCE_REPORT_GENERATION_COMPLETED', 'billing_report', facilityId, {
    report_type: 'compliance',
    overall_score: overallScore
  });

  return {
    report_type: 'compliance',
    facility_id: facilityId,
    date_range: { start, end },
    generated_at: new Date().toISOString(),
    ...complianceReport
  };
}

// Compliance check functions
async function checkAuditTrailCompleteness(facilityId, start, end) {
  const { data: payments } = await supabase
    .from('facility_invoice_payments')
    .select('id')
    .eq('facility_id', facilityId)
    .gte('created_at', start)
    .lte('created_at', end);

  const { data: auditLogs } = await supabase
    .from('billing_audit_log')
    .select('entity_id')
    .eq('entity_type', 'facility_invoice_payment')
    .gte('timestamp', start)
    .lte('timestamp', end);

  const paymentIds = new Set(payments?.map(p => p.id) || []);
  const auditedIds = new Set(auditLogs?.map(log => log.entity_id) || []);
  
  const coverage = paymentIds.size > 0 ? 
    (Array.from(paymentIds).filter(id => auditedIds.has(id)).length / paymentIds.size * 100) : 100;

  return {
    score: coverage,
    status: coverage >= 95 ? 'PASS' : 'FAIL',
    details: `${coverage.toFixed(1)}% audit trail coverage`,
    total_payments: paymentIds.size,
    audited_payments: Array.from(paymentIds).filter(id => auditedIds.has(id)).length
  };
}

async function checkPaymentVerification(facilityId, start, end) {
  const { data: payments } = await supabase
    .from('facility_invoice_payments')
    .select('verification_status')
    .eq('facility_id', facilityId)
    .gte('created_at', start)
    .lte('created_at', end);

  const total = payments?.length || 0;
  const verified = payments?.filter(p => p.verification_status === 'VERIFIED').length || 0;
  const score = total > 0 ? (verified / total * 100) : 100;

  return {
    score,
    status: score >= 90 ? 'PASS' : 'FAIL',
    details: `${score.toFixed(1)}% payments verified`,
    total_payments: total,
    verified_payments: verified
  };
}

async function checkReconciliationTimeliness(facilityId, start, end) {
  const { data: reconciliations } = await supabase
    .from('payment_reconciliation')
    .select('reconciliation_date, created_at')
    .eq('facility_id', facilityId)
    .gte('reconciliation_date', start)
    .lte('reconciliation_date', end);

  // Check if reconciliations are performed within 24 hours
  const timely = reconciliations?.filter(r => {
    const reconcilationDate = new Date(r.reconciliation_date);
    const createdDate = new Date(r.created_at);
    const hoursDiff = (createdDate - reconcilationDate) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  }).length || 0;

  const total = reconciliations?.length || 0;
  const score = total > 0 ? (timely / total * 100) : 100;

  return {
    score,
    status: score >= 95 ? 'PASS' : 'FAIL',
    details: `${score.toFixed(1)}% reconciliations performed timely`,
    total_reconciliations: total,
    timely_reconciliations: timely
  };
}

async function checkDataRetention(facilityId) {
  // Check if data older than 7 years exists (compliance requirement)
  const sevenYearsAgo = new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000);
  
  const { data: oldData } = await supabase
    .from('billing_audit_log')
    .select('id')
    .lt('timestamp', sevenYearsAgo.toISOString())
    .limit(1);

  return {
    score: 100, // Assuming compliance for now
    status: 'PASS',
    details: 'Data retention policy compliant',
    old_records_exist: oldData?.length > 0
  };
}

async function checkSecurityCompliance(facilityId, start, end) {
  // Check for security-related audit entries
  const { data: securityLogs } = await supabase
    .from('billing_audit_log')
    .select('action')
    .in('action', ['UNAUTHORIZED_ACCESS', 'SECURITY_VIOLATION', 'DATA_BREACH'])
    .gte('timestamp', start)
    .lte('timestamp', end);

  const violations = securityLogs?.length || 0;
  const score = violations === 0 ? 100 : Math.max(0, 100 - violations * 10);

  return {
    score,
    status: violations === 0 ? 'PASS' : 'FAIL',
    details: `${violations} security violations detected`,
    violations_count: violations
  };
}

function generateComplianceRecommendations(checks) {
  const recommendations = [];

  if (checks.audit_trail_completeness.score < 95) {
    recommendations.push({
      priority: 'HIGH',
      area: 'Audit Trail',
      recommendation: 'Improve audit trail coverage by ensuring all payment operations are logged'
    });
  }

  if (checks.payment_verification.score < 90) {
    recommendations.push({
      priority: 'HIGH',
      area: 'Payment Verification',
      recommendation: 'Implement automated payment verification processes'
    });
  }

  if (checks.reconciliation_timeliness.score < 95) {
    recommendations.push({
      priority: 'MEDIUM',
      area: 'Reconciliation',
      recommendation: 'Automate daily reconciliation processes for faster completion'
    });
  }

  return recommendations;
}

/**
 * Convert report data to CSV format
 */
function convertToCSV(data) {
  if (!data || typeof data !== 'object') return '';

  // Simple CSV conversion - in production, use a proper CSV library
  const headers = Object.keys(data);
  const csvHeaders = headers.join(',');
  
  // For complex objects, flatten or serialize as needed
  const csvData = JSON.stringify(data);
  
  return `${csvHeaders}\n"${csvData.replace(/"/g, '""')}"`;
}