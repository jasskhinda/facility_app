// Debug script to check what's causing the facility settings error
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugFacilitySettings() {
  try {
    console.log('🔍 Debugging facility settings...');
    
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test the exact query the frontend is making
    console.log('📋 Testing facility_users query...');
    const { data, error } = await adminSupabase
      .from('facility_users')
      .select(`
        id,
        user_id,
        role,
        status,
        invited_at,
        invited_by,
        is_owner
      `)
      .eq('facility_id', 'c782252e-1a2b-4740-9bd7-e4fdf8d565a1') // Green Valley Medical Center
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('❌ Query error:', error);
    } else {
      console.log('✅ Query successful:', data);
      
      // Test data transformation
      console.log('🔄 Testing data transformation...');
      const transformedUsers = data.map(user => {
        return {
          ...user,
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          is_owner: Boolean(user.is_owner)
        };
      });
      
      console.log('✅ Transformed data:', transformedUsers);
    }

    // Test profiles query
    console.log('📋 Testing profiles query...');
    const userIds = data?.map(user => user.user_id) || [];
    
    if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await adminSupabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('❌ Profiles error:', profilesError);
      } else {
        console.log('✅ Profiles data:', profilesData);
      }
    }

  } catch (error) {
    console.error('💥 Debug error:', error);
  }
}

debugFacilitySettings();