import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    
    if (!facilityId) {
      return NextResponse.json({ error: 'Facility ID is required' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    
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

    return NextResponse.json({
      facilityId,
      totalMethods: methods?.length || 0,
      defaultCount,
      defaultMethod,
      allMethods: methods || []
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}