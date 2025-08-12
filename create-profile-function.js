import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createProfileFunction() {
  try {
    console.log('🔧 Creating profile helper function...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create a function to handle profile creation with admin privileges
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION create_user_profile(
        user_id UUID,
        first_name TEXT,
        last_name TEXT,
        facility_id UUID,
        email TEXT
      )
      RETURNS VOID
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        INSERT INTO profiles (
          id,
          first_name,
          last_name,
          full_name,
          facility_id,
          role,
          email,
          status,
          created_at,
          updated_at
        ) VALUES (
          user_id,
          first_name,
          last_name,
          first_name || ' ' || last_name,
          facility_id,
          'facility',
          email,
          'active',
          NOW(),
          NOW()
        );
      END;
      $$;
    `;

    // We can't use rpc to create functions, so let's just test the direct approach
    console.log('🧪 Testing direct profile creation...');
    
    // Test with a dummy user ID
    const testUserId = '00000000-0000-0000-0000-000000000000';
    const testFacilityId = '39fad399-1707-495c-bbb9-7bf153117309'; // Use existing facility ID
    
    const { data, error } = await adminSupabase
      .from('profiles')
      .insert({
        id: testUserId,
        first_name: 'Test',
        last_name: 'User',
        facility_id: testFacilityId,
        role: 'facility',
        email: 'test@example.com',
        status: 'active'
      })
      .select();

    if (error) {
      console.error('❌ Direct insert error:', error);
    } else {
      console.log('✅ Direct insert successful:', data);
      
      // Clean up test record
      await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', testUserId);
      
      console.log('✅ Test record cleaned up');
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

createProfileFunction();