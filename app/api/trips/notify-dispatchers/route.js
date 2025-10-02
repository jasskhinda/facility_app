import { createRouteHandlerClient } from '@/lib/route-handler-client';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
const { notifyDispatchersOfNewTrip, sendFacilityConfirmation, sendClientConfirmation } = require('@/lib/notifications');

export async function POST(request) {
  try {
    // Create Supabase client
    const supabase = await createRouteHandlerClient();
    
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session, return unauthorized
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get trip ID from request body
    const { tripId } = await request.json();
    
    if (!tripId) {
      return NextResponse.json(
        { error: 'Trip ID is required' },
        { status: 400 }
      );
    }
    
    // Get user's profile to check if they're facility staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, facility_id')
      .eq('id', session.user.id)
      .single();

    const isFacilityStaff = profile?.role === 'facility';

    // Fetch the trip details
    // For facility staff: allow access to any trip from their facility
    // For regular users: only allow access to their own trips
    let tripQuery = supabase
      .from('trips')
      .select('*')
      .eq('id', tripId);

    // If not facility staff, restrict to user's own trips
    if (!isFacilityStaff) {
      tripQuery = tripQuery.eq('user_id', session.user.id);
    }

    const { data: trip, error: tripError } = await tripQuery.single();

    if (tripError || !trip) {
      console.error('Error fetching trip:', tripError);
      return NextResponse.json(
        { error: 'Trip not found or access denied' },
        { status: 404 }
      );
    }

    // Additional security: verify facility staff can only access trips from their facility
    if (isFacilityStaff && trip.facility_id && trip.facility_id !== profile.facility_id) {
      return NextResponse.json(
        { error: 'Access denied - trip belongs to different facility' },
        { status: 403 }
      );
    }

    // Enrich trip data with client and facility information for better email notifications
    try {
      console.log('📋 Enriching trip data. managed_client_id:', trip.managed_client_id, 'facility_id:', trip.facility_id);

      // Fetch client data if it's a managed client
      if (trip.managed_client_id) {
        const { data: clientData } = await supabase
          .from('facility_managed_clients')
          .select('first_name, last_name, email')
          .eq('id', trip.managed_client_id)
          .single();

        if (clientData) {
          trip.client_info = clientData;
          console.log('✅ Client info fetched:', clientData.email);
        } else {
          console.log('⚠️ No client data found for managed_client_id:', trip.managed_client_id);
        }
      }

      // Fetch facility data if there's a facility_id
      if (trip.facility_id) {
        const { data: facilityData } = await supabase
          .from('facilities')
          .select('contact_email, name')
          .eq('id', trip.facility_id)
          .single();

        if (facilityData) {
          trip.facility_info = facilityData;
          console.log('✅ Facility info fetched:', facilityData.contact_email);
        } else {
          console.log('⚠️ No facility data found for facility_id:', trip.facility_id);
        }
      }
    } catch (enrichError) {
      // Don't fail if enrichment fails - just log and continue
      console.log('❌ Could not enrich trip data:', enrichError.message);
    }

    // Set a timeout to prevent the API from hanging if notification takes too long
    // This makes the endpoint more resilient when handling many concurrent requests
    let notificationTimeout;
    
    const timeoutPromise = new Promise((_, reject) => {
      notificationTimeout = setTimeout(() => {
        reject(new Error('Notification timeout - operation will continue in background'));
      }, 5000); // 5 second timeout which is plenty for the initial response
    });
    
    try {
      // Race between notification and timeout
      const result = await Promise.race([
        notifyDispatchersOfNewTrip(trip, session.user),
        timeoutPromise
      ]);
      
      // If we get here, notification succeeded before timeout
      clearTimeout(notificationTimeout);
      
      if (!result.success) {
        console.error('Failed to notify dispatchers:', result.error);
        return NextResponse.json(
          { error: 'Failed to notify dispatchers', details: result.error },
          { status: 500 }
        );
      }

      // Send confirmation emails in the background (non-blocking)
      // For facility bookings, send to facility and client
      console.log('📧 Checking confirmation emails. managed_client_id:', trip.managed_client_id, 'client_info:', !!trip.client_info, 'facility_info:', !!trip.facility_info);

      if (trip.managed_client_id && trip.client_info && trip.facility_info) {
        const clientName = `${trip.client_info.first_name} ${trip.client_info.last_name}`;
        console.log('📧 Sending facility confirmation to:', trip.facility_info.contact_email);

        // Send facility confirmation
        sendFacilityConfirmation(trip, trip.facility_info.contact_email, clientName)
          .catch(err => console.error('❌ Error sending facility confirmation:', err));

        // Send client confirmation if they have an email
        if (trip.client_info.email) {
          console.log('📧 Sending client confirmation to:', trip.client_info.email);
          sendClientConfirmation(trip, trip.client_info.email, clientName)
            .catch(err => console.error('❌ Error sending client confirmation:', err));
        } else {
          console.log('⚠️ Client has no email, skipping client confirmation');
        }
      }
      // For direct bookings, send to client only
      else if (session.user.email) {
        const clientName = session.user.user_metadata?.full_name || 'Valued Customer';
        console.log('📧 Direct booking - sending client confirmation to:', session.user.email);
        sendClientConfirmation(trip, session.user.email, clientName)
          .catch(err => console.error('❌ Error sending client confirmation:', err));
      } else {
        console.log('⚠️ No confirmation emails sent - missing required data');
      }

      return NextResponse.json({
        success: true,
        message: 'Dispatchers notified successfully'
      });
    } catch (timeoutError) {
      // If we hit the timeout, continue the notification in background and return success
      console.log('Notification taking longer than expected, continuing in background');
      
      // Continue the notification process in background without awaiting it
      notifyDispatchersOfNewTrip(trip, session.user)
        .then(result => {
          if (result.success) {
            console.log('Background notification completed successfully');
          } else {
            console.error('Background notification failed:', result.error);
          }
        })
        .catch(err => {
          console.error('Error in background notification:', err);
        });
      
      // Return success to the client, as this is non-blocking
      return NextResponse.json({
        success: true,
        message: 'Trip created. Dispatcher notification in progress.'
      });
    }
  } catch (error) {
    console.error('Error in notify-dispatchers endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}