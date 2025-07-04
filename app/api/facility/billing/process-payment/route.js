/**
 * Professional Payment Processing API
 * Enterprise-grade payment processing with full audit trail
 */

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const supabase = await createRouteHandlerClient();
    
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

    // Get current user for audit logging
    console.log('🔍 Attempting to get user...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('🔍 Session result:', { hasSession: !!session, error: sessionError?.message });
    
    if (sessionError || !session) {
      console.error('❌ Authentication failed:', { sessionError, hasSession: !!session });
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    const user = session.user;
    console.log('✅ User authenticated:', user.id);

    // Verify user has access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', user.id)
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

    // Create payment record using service role for database operations
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: payment, error: paymentError } = await adminSupabase
      .from('facility_invoice_payments')
      .insert({
        facility_id,
        amount: parseFloat(amount),
        payment_method: 'check_submit',
        status: 'pending_verification',
        month: month || new Date().toISOString().slice(0, 7),
        payment_date: new Date().toISOString(),
        payment_note: `${notes}\n\nProcessed by user: ${user.email}`,
        check_submission_type: payment_data.check_submission_type || 'will_mail'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation failed:', paymentError);
      console.error('Payment data attempted:', {
        facility_id,
        amount: parseFloat(amount),
        payment_method: 'check_submit',
        status: 'pending_verification',
        month: month || new Date().toISOString().slice(0, 7)
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to create payment record',
        details: paymentError.message,
        code: paymentError.code
      }, { status: 500 });
    }

    // For check payments, create the traditional invoice record for backward compatibility
    if (payment_method === 'CHECK_PAYMENT') {
      try {
        // Determine correct payment status based on check submission type
        let paymentStatus = 'CHECK PAYMENT - WILL MAIL';
        if (payment_data.check_submission_type === 'already_mailed') {
          paymentStatus = 'CHECK PAYMENT - ALREADY SENT';
        } else if (payment_data.check_submission_type === 'hand_delivered') {
          paymentStatus = 'CHECK PAYMENT - BEING VERIFIED';
        }

        const invoiceData = {
          facility_id,
          month: month || new Date().toISOString().slice(0, 7),
          total_amount: parseFloat(amount),
          trip_ids,
          payment_status: paymentStatus,
          payment_date: new Date().toISOString(),
          notes: `${notes}\n\nProcessed by user: ${user.email}. Payment ID: ${payment.id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: invoiceError } = await adminSupabase
          .from('facility_invoices')
          .upsert(invoiceData, { 
            onConflict: 'facility_id,month',
            ignoreDuplicates: false 
          });

        if (invoiceError) {
          console.error('Legacy invoice creation failed:', invoiceError);
          // Don't fail the payment, just log the issue
        }
      } catch (legacyError) {
        console.error('Legacy invoice process failed:', legacyError);
        // Continue - don't fail the payment for legacy compatibility issues
      }
    }

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      amount: parseFloat(amount),
      message: 'Payment processed successfully',
      verification_status: 'PROCESSING'
    });

  } catch (error) {
    console.error('Payment processing failed:', error);

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

    // Use service role client for status checks
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get payment status
    const { data: payment, error } = await adminSupabase
      .from('facility_invoice_payments')
      .select(`
        id, amount, status, verification_status, payment_method,
        created_at, reconciled_at
      `)
      .eq('id', paymentId)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        verification_status: payment.verification_status,
        payment_method: payment.payment_method,
        created_at: payment.created_at,
        reconciled_at: payment.reconciled_at
      }
    });

  } catch (error) {
    console.error('Payment status check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Payment status check failed',
      details: error.message
    }, { status: 500 });
  }
}