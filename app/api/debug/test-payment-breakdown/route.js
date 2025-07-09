import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    const month = searchParams.get('month') || '2025-07';
    
    if (!facilityId) {
      return NextResponse.json({ error: 'Facility ID is required' }, { status: 400 });
    }

    // Call our payment breakdown API
    const response = await fetch(`${request.nextUrl.origin}/api/facility/billing/calculate-payment-amounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facility_id: facilityId,
        month: month
      })
    });

    const data = await response.json();
    
    return NextResponse.json({
      api_response: data,
      debug_info: {
        facility_id: facilityId,
        month: month,
        show_paid_amount: data.success ? data.payment_breakdown.show_paid_amount : 'ERROR',
        paid_amount: data.success ? data.payment_breakdown.paid_amount : 'ERROR',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}