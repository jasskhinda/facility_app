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
        console.log('🔍 Processing check payment for facility_id:', facility_id, 'month:', month);
        
        // Check if there's an existing invoice first
        const { data: existingInvoice, error: existingError } = await adminSupabase
          .from('facility_invoices')
          .select('*')
          .eq('facility_id', facility_id)
          .eq('month', month || new Date().toISOString().slice(0, 7))
          .order('created_at', { ascending: false })
          .limit(1);

        console.log('🔍 Existing invoice check:', { existingInvoice, existingError });

        // Determine correct payment status based on check submission type
        let paymentStatus = 'CHECK PAYMENT - WILL MAIL';
        const submissionType = payment_data.submission_type || payment_data.check_submission_type;
        
        console.log('🔍 Submission type:', submissionType);
        
        if (submissionType === 'already_mailed') {
          paymentStatus = 'CHECK PAYMENT - ALREADY SENT';
        } else if (submissionType === 'hand_delivered') {
          paymentStatus = 'CHECK PAYMENT - BEING VERIFIED';
        }

        console.log('🔍 New payment status will be:', paymentStatus);

        // Generate invoice number if updating existing invoice or create new one
        let invoiceNumber;
        if (existingInvoice && existingInvoice.length > 0) {
          invoiceNumber = existingInvoice[0].invoice_number;
          console.log('🔍 Using existing invoice number:', invoiceNumber);
        } else {
          // Generate new invoice number
          const monthYear = (month || new Date().toISOString().slice(0, 7)).replace('-', '');
          const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
          invoiceNumber = `CCT-${monthYear}-${randomSuffix}`;
          console.log('🔍 Generated new invoice number:', invoiceNumber);
        }

        const invoiceData = {
          facility_id,
          invoice_number: invoiceNumber,
          month: month || new Date().toISOString().slice(0, 7),
          total_amount: parseFloat(amount),
          trip_ids,
          payment_status: paymentStatus,
          payment_date: new Date().toISOString(),
          payment_notes: `${notes}\n\nProcessed by user: ${user.email}. Payment ID: ${payment.id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('🔍 Invoice data to upsert:', invoiceData);

        const { data: upsertResult, error: invoiceError } = await adminSupabase
          .from('facility_invoices')
          .upsert(invoiceData, { 
            onConflict: 'facility_id,month',
            ignoreDuplicates: false 
          })
          .select();

        console.log('🔍 Upsert result:', { upsertResult, invoiceError });

        if (invoiceError) {
          console.error('❌ Legacy invoice creation failed:', invoiceError);
          console.error('❌ Invoice error details:', {
            message: invoiceError.message,
            details: invoiceError.details,
            hint: invoiceError.hint,
            code: invoiceError.code
          });
          // Return error to frontend so we can see what's happening
          return NextResponse.json({
            success: false,
            error: 'Invoice update failed',
            details: invoiceError.message,
            code: invoiceError.code,
            payment_id: payment.id
          }, { status: 400 });
        } else {
          console.log('✅ Invoice upsert successful:', upsertResult);
        }
      } catch (legacyError) {
        console.error('❌ Legacy invoice process failed:', legacyError);
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