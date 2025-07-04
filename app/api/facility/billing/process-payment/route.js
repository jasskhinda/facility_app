/**
 * Professional Payment Processing API
 * Enterprise-grade payment processing with full audit trail
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PaymentTransactionManager } from '@/lib/billing-audit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  let paymentManager;
  
  try {
    const requestData = await request.json();
    const { 
      facility_id, 
      trip_ids, 
      amount, 
      payment_method, 
      payment_data = {},
      month,
      notes = ''
    } = requestData;

    // Validate required fields
    if (!facility_id || !trip_ids || !amount || !payment_method) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: facility_id, trip_ids, amount, payment_method'
      }, { status: 400 });
    }

    // Get current session for audit logging
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Verify user has access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Profile not found' 
      }, { status: 404 });
    }

    if (profile.role === 'facility' && profile.facility_id !== facility_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    // Initialize payment transaction manager with full audit trail
    paymentManager = new PaymentTransactionManager(session.user.id, session.id);

    // Process payment with enterprise-grade integrity checks
    const paymentResult = await paymentManager.processPayment(
      facility_id,
      trip_ids,
      parseFloat(amount),
      payment_method,
      {
        ...payment_data,
        month,
        notes,
        facility_name: payment_data.facility_name || 'Unknown Facility',
        user_agent: request.headers.get('user-agent'),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      }
    );

    // For check payments, create the traditional invoice record for backward compatibility
    if (payment_method === 'CHECK_PAYMENT' && paymentResult.success) {
      try {
        const invoiceData = {
          facility_id,
          month: month || new Date().toISOString().slice(0, 7),
          total_amount: parseFloat(amount),
          trip_ids,
          payment_status: 'CHECK PAYMENT - WILL MAIL',
          payment_date: new Date().toISOString(),
          notes: `${notes}\n\nProcessed via enterprise audit system. Payment ID: ${paymentResult.payment_id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: invoiceError } = await supabase
          .from('facility_invoices')
          .upsert(invoiceData, { 
            onConflict: 'facility_id,month',
            ignoreDuplicates: false 
          });

        if (invoiceError) {
          console.error('Legacy invoice creation failed:', invoiceError);
          // Don't fail the payment, just log the issue
          await paymentManager.auditLogger.log('LEGACY_INVOICE_CREATION_FAILED', 'facility_invoice', facility_id, {
            error: invoiceError.message,
            payment_id: paymentResult.payment_id
          });
        }
      } catch (legacyError) {
        console.error('Legacy invoice process failed:', legacyError);
        // Continue - don't fail the payment for legacy compatibility issues
      }
    }

    return NextResponse.json({
      success: true,
      payment_id: paymentResult.payment_id,
      amount: paymentResult.amount,
      message: 'Payment processed successfully with full audit trail',
      verification_status: 'PROCESSING',
      audit_trail_id: paymentManager.auditLogger.correlationId
    });

  } catch (error) {
    console.error('Payment processing failed:', error);

    // Comprehensive error logging
    if (paymentManager) {
      await paymentManager.auditLogger.log('PAYMENT_PROCESSING_ERROR', 'payment_error', null, {
        error: error.message,
        stack: error.stack,
        request_data: requestData
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Payment processing failed',
      details: error.message,
      code: 'PAYMENT_PROCESSING_ERROR'
    }, { status: 500 });
  }
}

// GET endpoint for payment status verification
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');
    const facilityId = searchParams.get('facility_id');

    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID required'
      }, { status: 400 });
    }

    // Get payment status from new audit system
    const { data: payment, error } = await supabase
      .from('facility_invoice_payments')
      .select(`
        id, amount, status, verification_status, payment_method,
        created_at, payment_hash, audit_trail, reconciled_at
      `)
      .eq('id', paymentId)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    // Verify payment integrity
    try {
      const paymentManager = new PaymentTransactionManager('system');
      const integrityCheck = await paymentManager.integrityManager.verifyPaymentIntegrity(paymentId);
      
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          verification_status: payment.verification_status,
          payment_method: payment.payment_method,
          created_at: payment.created_at,
          reconciled_at: payment.reconciled_at,
          integrity_verified: integrityCheck.verified
        }
      });
    } catch (integrityError) {
      console.error('Payment integrity check failed:', integrityError);
      
      return NextResponse.json({
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          verification_status: payment.verification_status,
          payment_method: payment.payment_method,
          created_at: payment.created_at,
          reconciled_at: payment.reconciled_at,
          integrity_verified: false,
          integrity_error: integrityError.message
        }
      });
    }

  } catch (error) {
    console.error('Payment status check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Payment status check failed',
      details: error.message
    }, { status: 500 });
  }
}