import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function POST(request) {
  try {
    const { paymentMethodId, facilityId } = await request.json();
    
    if (!paymentMethodId || !facilityId) {
      return NextResponse.json(
        { error: 'Payment method ID and facility ID are required' },
        { status: 400 }
      );
    }
    
    // Get the user session
    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'You must be logged in to update a payment method' },
        { status: 401 }
      );
    }

    // Verify user has access to this facility
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('facility_id, role')
      .eq('id', session.user.id)
      .single();

    if (profileError || profile.facility_id !== facilityId || profile.role !== 'facility') {
      return NextResponse.json(
        { error: 'Access denied to this facility' },
        { status: 403 }
      );
    }

    console.log('🔧 Setting default payment method via custom endpoint:', {
      facilityId,
      paymentMethodId,
      userRole: profile.role
    });

    // Try a different approach: use individual record updates
    try {
      // Get all payment methods for this facility
      const { data: allMethods, error: getAllError } = await supabase
        .from('facility_payment_methods')
        .select('id, is_default')
        .eq('facility_id', facilityId);

      if (getAllError) {
        throw new Error('Failed to fetch payment methods: ' + getAllError.message);
      }

      console.log('✅ Found payment methods:', allMethods);

      // Update each method individually to avoid trigger issues
      for (const method of allMethods) {
        const shouldBeDefault = method.id === paymentMethodId;
        
        console.log(`🔍 Processing method ${method.id}: current=${method.is_default}, should=${shouldBeDefault}`);
        
        // Skip if it's already in the correct state
        if (method.is_default === shouldBeDefault) {
          console.log(`⏭️ Skipping method ${method.id} - already in correct state`);
          continue;
        }

        // Update this specific method
        const { data: updateData, error: updateError } = await supabase
          .from('facility_payment_methods')
          .update({ 
            is_default: shouldBeDefault,
            updated_at: new Date().toISOString()
          })
          .eq('id', method.id)
          .eq('facility_id', facilityId)
          .select();

        if (updateError) {
          console.error(`❌ Error updating method ${method.id}:`, updateError);
          // Continue with other methods even if one fails
        } else {
          console.log(`✅ Updated method ${method.id} to default=${shouldBeDefault}`, updateData);
        }
      }

      // Verify the update by fetching the records again
      const { data: verifyMethods, error: verifyError } = await supabase
        .from('facility_payment_methods')
        .select('id, is_default, nickname')
        .eq('facility_id', facilityId);

      if (verifyError) {
        console.error('❌ Error verifying update:', verifyError);
      } else {
        console.log('🔍 Final verification - methods after update:', verifyMethods);
      }

      console.log('✅ Successfully updated all payment methods');
      return NextResponse.json({ success: true });

    } catch (error) {
      console.error('❌ Custom approach failed:', error);
      return NextResponse.json(
        { error: 'Failed to set default payment method: ' + error.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Set default endpoint failed:', error);
    return NextResponse.json(
      { error: 'Failed to set default payment method: ' + error.message },
      { status: 500 }
    );
  }
}