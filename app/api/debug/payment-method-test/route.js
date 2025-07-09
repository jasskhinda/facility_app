import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function GET(request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('facility_id, role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'facility') {
      return NextResponse.json({ error: 'Not a facility user' }, { status: 403 });
    }

    // Test 1: Check if payment methods table exists and has data
    const { data: paymentMethods, error: pmError } = await supabase
      .from('facility_payment_methods')
      .select('*')
      .eq('facility_id', profile.facility_id);

    // Test 2: Check if function exists
    const { data: functionResult, error: functionError } = await supabase.rpc('set_default_payment_method', {
      p_facility_id: profile.facility_id,
      p_payment_method_id: '00000000-0000-0000-0000-000000000000' // Test UUID
    });

    return NextResponse.json({
      userId: session.user.id,
      profile: profile,
      paymentMethods: {
        data: paymentMethods,
        error: pmError,
        count: paymentMethods?.length || 0
      },
      functionTest: {
        result: functionResult,
        error: functionError,
        errorCode: functionError?.code,
        errorMessage: functionError?.message
      }
    });

  } catch (error) {
    console.error('Debug test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}