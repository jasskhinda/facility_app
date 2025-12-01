import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
      console.log('✅ Push notification sent:', result);
      return result;
    } else {
      console.error('❌ Failed to send push notification:', await response.text());
      return null;
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    const { tripId, status, reason } = await request.json();

    if (!tripId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: tripId and status' },
        { status: 400 }
      );
    }

    // Get current trip data for pickup address
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

    // Send push notification to dispatchers
    const notificationResult = await sendDispatcherPushNotification(
      tripId,
      action,
      { pickup_address: trip.pickup_address || 'Unknown' }
    );

    return NextResponse.json({
      success: true,
      trip: updatedTrip,
      notification: notificationResult ? 'sent' : 'failed',
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
