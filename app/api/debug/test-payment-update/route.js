import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function POST(request) {
  try {
    const { facilityId, paymentMethodId } = await request.json();
    
    if (!facilityId || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    
    console.log('🧪 Testing payment method update with direct database operation');
    
    // Step 1: Get current state
    const { data: beforeUpdate, error: beforeError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', facilityId);
    
    if (beforeError) {
      return NextResponse.json({ error: beforeError.message }, { status: 500 });
    }
    
    console.log('📊 Before update:', beforeUpdate);
    
    // Step 2: Try direct update without trigger
    const { data: updateResult, error: updateError } = await supabase
      .from('facility_payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .eq('facility_id', facilityId)
      .select();
    
    if (updateError) {
      console.error('❌ Direct update failed:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    console.log('✅ Direct update result:', updateResult);
    
    // Step 3: Check state after update
    const { data: afterUpdate, error: afterError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', facilityId);
    
    if (afterError) {
      return NextResponse.json({ error: afterError.message }, { status: 500 });
    }
    
    console.log('📊 After update:', afterUpdate);
    
    // Step 4: Try using the database function
    const { data: functionResult, error: functionError } = await supabase
      .rpc('set_default_payment_method', {
        p_facility_id: facilityId,
        p_payment_method_id: paymentMethodId
      });
    
    if (functionError) {
      console.error('❌ Function call failed:', functionError);
    } else {
      console.log('✅ Function call result:', functionResult);
    }
    
    // Step 5: Final state check
    const { data: finalState, error: finalError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', facilityId);
    
    if (finalError) {
      return NextResponse.json({ error: finalError.message }, { status: 500 });
    }
    
    console.log('📊 Final state:', finalState);
    
    return NextResponse.json({
      beforeUpdate,
      updateResult,
      afterUpdate,
      functionResult,
      finalState
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}