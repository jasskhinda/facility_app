import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    const paymentMethodId = searchParams.get('paymentMethodId');
    
    if (!facilityId || !paymentMethodId) {
      return NextResponse.json({ error: 'Missing facilityId or paymentMethodId' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    
    // Direct SQL query to check current state
    const { data: currentState, error: currentError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', facilityId);
    
    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }
    
    // Try a direct update
    const { data: updateResult, error: updateError } = await supabase
      .from('facility_payment_methods')
      .update({ is_default: true })
      .eq('id', paymentMethodId)
      .eq('facility_id', facilityId)
      .select();
    
    // Check state after update
    const { data: afterUpdate, error: afterError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', facilityId);
    
    return NextResponse.json({
      facilityId,
      paymentMethodId,
      currentState,
      updateResult,
      updateError,
      afterUpdate,
      afterError
    });
    
  } catch (error) {
    console.error('Direct SQL test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}