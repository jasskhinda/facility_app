import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Send Expo Push Notification
 *
 * This API endpoint sends push notifications to facility users via Expo Push Service
 * Triggered when dispatchers send messages or update trip status
 */
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    const {
      facilityId,
      userId, // Optional: specific user, otherwise all facility users
      title,
      body: notificationBody,
      data = {}
    } = body;

    console.log('📤 Sending push notification:', { facilityId, userId, title });

    if (!facilityId || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: facilityId, title, body' },
        { status: 400 }
      );
    }

    // Get push tokens for the facility users
    let query = supabase
      .from('facility_push_tokens')
      .select('user_id, push_token, platform')
      .eq('facility_id', facilityId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: tokens, error: tokenError } = await query;

    if (tokenError) {
      console.error('❌ Error fetching push tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch push tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No push tokens found for facility:', facilityId);
      return NextResponse.json(
        { message: 'No push tokens found', sent: 0 },
        { status: 200 }
      );
    }

    console.log(`📱 Found ${tokens.length} push token(s)`);

    // Filter out LOCAL_NOTIFICATIONS_ONLY tokens
    const validTokens = tokens.filter(t =>
      t.push_token &&
      t.push_token !== 'LOCAL_NOTIFICATIONS_ONLY' &&
      t.push_token.startsWith('ExponentPushToken[')
    );

    if (validTokens.length === 0) {
      console.log('⚠️ No valid Expo push tokens found');
      return NextResponse.json(
        { message: 'No valid Expo push tokens', sent: 0 },
        { status: 200 }
      );
    }

    console.log(`✅ Sending to ${validTokens.length} valid token(s)`);

    // Prepare push notification messages
    const messages = validTokens.map(token => ({
      to: token.push_token,
      sound: 'default',
      title: title,
      body: notificationBody,
      data: {
        ...data,
        facilityId,
      },
      priority: 'high',
      channelId: 'default',
    }));

    // Send to Expo Push API
    const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoPushResult = await expoPushResponse.json();
    console.log('📨 Expo Push API response:', expoPushResult);

    // Save notification to database for each user
    const notificationInserts = validTokens.map(token => ({
      user_id: token.user_id,
      facility_id: facilityId,
      title: title,
      body: notificationBody,
      data: data,
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('facility_notifications')
      .insert(notificationInserts);

    if (insertError) {
      console.error('❌ Error saving notifications to database:', insertError);
      // Don't fail the request - push was sent
    } else {
      console.log('✅ Notifications saved to database');
    }

    // Check for errors in Expo response
    const errors = expoPushResult.data?.filter(result => result.status === 'error') || [];
    if (errors.length > 0) {
      console.error('❌ Some push notifications failed:', errors);
    }

    return NextResponse.json({
      success: true,
      sent: validTokens.length,
      results: expoPushResult.data,
    });

  } catch (error) {
    console.error('❌ Error in send-push API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
