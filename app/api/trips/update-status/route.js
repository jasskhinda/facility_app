import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client lazily to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Send push notification to dispatcher mobile app
async function sendDispatcherPushNotification(tripId, action, tripDetails = {}) {
  try {
    const response = await fetch('https://dispatch.compassionatecaretransportation.com/api/notifications/send-dispatcher-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        action,
        source: 'facility_app',
        tripDetails,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Dispatcher push notification sent:', result);
      return result;
    } else {
      console.error('❌ Failed to send dispatcher push notification:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error sending dispatcher push notification:', error);
    return null;
  }
}

// Send push notification to facility mobile app
async function sendFacilityPushNotification(facilityId, title, body, data = {}) {
  try {
    if (!facilityId) {
      console.log('⚠️ No facilityId provided, skipping facility notification');
      return null;
    }

    const response = await fetch('https://dispatch.compassionatecaretransportation.com/api/notifications/send-facility-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilityId,
        title,
        body,
        data,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Facility push notification sent:', result);
      return result;
    } else {
      console.error('❌ Failed to send facility push notification:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error sending facility push notification:', error);
    return null;
  }
}

export async function POST(request) {
  const supabase = getSupabase();

  try {
    const { tripId, status, reason } = await request.json();

    if (!tripId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: tripId and status' },
        { status: 400 }
      );
    }

    // Get current trip data for pickup address and client info
    const { data: trip, error: fetchError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (fetchError || !trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Get client name if managed client
    let clientName = 'Client';
    if (trip.managed_client_id) {
      const { data: clientData } = await supabase
        .from('facility_managed_clients')
        .select('first_name, last_name')
        .eq('id', trip.managed_client_id)
        .single();
      if (clientData) {
        clientName = `${clientData.first_name} ${clientData.last_name}`;
      }
    }

    // Build update data
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'cancelled' && reason) {
      updateData.cancellation_reason = reason;
      updateData.refund_status = 'Pending';
    }

    // Update trip status
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', tripId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating trip:', updateError);
      return NextResponse.json(
        { error: 'Failed to update trip status' },
        { status: 500 }
      );
    }

    // Map status to notification action
    let action = status;
    if (status === 'cancelled' || status === 'canceled') {
      action = 'cancelled';
    }

    // Send push notification to dispatcher_mobile
    const dispatcherNotification = await sendDispatcherPushNotification(
      tripId,
      action,
      { pickup_address: trip.pickup_address || 'Unknown' }
    );

    // Send push notification to facility_mobile (if facility trip)
    let facilityNotification = null;
    if (trip.facility_id) {
      let title = 'Trip Updated';
      let body = `${clientName}'s trip status changed to ${status}`;

      if (action === 'cancelled') {
        title = '❌ Trip Cancelled';
        body = `${clientName}'s trip has been cancelled${reason ? `: ${reason}` : ''}`;
      } else if (action === 'completed') {
        title = '✅ Trip Completed';
        body = `${clientName}'s trip has been completed successfully`;
      } else if (action === 'approved' || status === 'upcoming') {
        title = '✅ Trip Approved';
        body = `${clientName}'s trip has been approved`;
      }

      facilityNotification = await sendFacilityPushNotification(
        trip.facility_id,
        title,
        body,
        { tripId: updatedTrip.id, action, reason }
      );
    }

    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      notifications: {
        dispatcher: dispatcherNotification ? 'sent' : 'failed',
        facility: facilityNotification ? 'sent' : 'skipped',
      },
      message: `Trip status updated to ${status}`,
    });

  } catch (error) {
    console.error('Error in update-status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
