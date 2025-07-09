import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    const paymentMethodId = searchParams.get('paymentMethodId');
    const fixTrigger = searchParams.get('fixTrigger');
    
    if (!facilityId) {
      return NextResponse.json({ error: 'Facility ID is required' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    
    // Fix trigger if requested
    if (fixTrigger === 'true') {
      console.log('🔧 Attempting to bypass trigger by updating without trigger...');
      
      // Try to disable and recreate trigger using available RPC functions
      try {
        // First try to see what RPC functions are available
        const { data: functions, error: funcError } = await supabase.rpc('version');
        console.log('Available functions test:', functions, funcError);
        
        // Try simple direct update bypassing trigger entirely
        const { data: directUpdate, error: directError } = await supabase
          .from('facility_payment_methods')
          .update({ is_default: true, updated_at: new Date().toISOString() })
          .eq('id', paymentMethodId)
          .eq('facility_id', facilityId)
          .select();
        
        if (directError) {
          return NextResponse.json({ 
            error: 'Direct update failed: ' + directError.message,
            directError,
            solution: 'Database trigger needs to be fixed manually in Supabase dashboard'
          }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Direct update succeeded - trigger may have been bypassed',
          directUpdate
        });
        
      } catch (err) {
        return NextResponse.json({ 
          error: 'Trigger fix attempt failed: ' + err.message,
          suggestion: 'Database trigger needs manual fix in Supabase dashboard'
        }, { status: 500 });
      }
    }
    
    // Get payment methods from database
    const { data: methods, error } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', facilityId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count defaults
    const defaultCount = methods?.filter(m => m.is_default).length || 0;
    const defaultMethod = methods?.find(m => m.is_default) || null;

    let testResult = null;
    
    // If paymentMethodId is provided, test updating it
    if (paymentMethodId) {
      console.log('🧪 Testing direct update for payment method:', paymentMethodId);
      
      try {
        // Try direct update
        const { data: updateResult, error: updateError } = await supabase
          .from('facility_payment_methods')
          .update({ is_default: true })
          .eq('id', paymentMethodId)
          .eq('facility_id', facilityId)
          .select();
        
        console.log('Update result:', updateResult);
        console.log('Update error:', updateError);
        
        // Check state after update
        const { data: afterUpdate, error: afterError } = await supabase
          .from('facility_payment_methods')
          .select('*')
          .eq('facility_id', facilityId);
        
        testResult = {
          updateResult,
          updateError: updateError ? updateError.message : null,
          afterUpdate,
          afterError: afterError ? afterError.message : null,
          testStatus: 'completed'
        };
      } catch (testError) {
        console.error('Test failed with exception:', testError);
        testResult = {
          testStatus: 'failed',
          testError: testError.message,
          stack: testError.stack
        };
      }
    }

    return NextResponse.json({
      facilityId,
      totalMethods: methods?.length || 0,
      defaultCount,
      defaultMethod,
      allMethods: methods || [],
      testResult
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}