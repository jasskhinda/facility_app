import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function debugDatabase() {
  try {
    console.log('🔍 Debugging database state...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if facility_users table exists
    console.log('📋 Checking if facility_users table exists...');
    const { data: tables, error: tablesError } = await adminSupabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'facility_users');

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📊 facility_users table exists:', tables.length > 0);
    }

    // Check if facility_contracts table exists
    console.log('📋 Checking if facility_contracts table exists...');
    const { data: contractTables, error: contractTablesError } = await adminSupabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'facility_contracts');

    if (contractTablesError) {
      console.error('❌ Error checking contract tables:', contractTablesError);
    } else {
      console.log('📊 facility_contracts table exists:', contractTables.length > 0);
    }

    // Try to create the tables manually
    console.log('🔧 Creating facility_users table...');
    const createFacilityUsersSQL = `
      CREATE TABLE IF NOT EXISTS facility_users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        facility_id UUID NOT NULL REFERENCES profiles(facility_id),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'scheduler')),
        invited_by UUID REFERENCES auth.users(id),
        invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(facility_id, user_id)
      );
    `;

    const { error: createError } = await adminSupabase.rpc('exec_sql', { 
      sql: createFacilityUsersSQL 
    });

    if (createError) {
      console.error('❌ Error creating facility_users table:', createError);
    } else {
      console.log('✅ facility_users table created/verified');
    }

    // Create facility_contracts table
    console.log('🔧 Creating facility_contracts table...');
    const createContractsSQL = `
      CREATE TABLE IF NOT EXISTS facility_contracts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        facility_id UUID NOT NULL REFERENCES profiles(facility_id),
        title TEXT NOT NULL,
        description TEXT,
        file_url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER,
        uploaded_by UUID REFERENCES auth.users(id),
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: createContractsError } = await adminSupabase.rpc('exec_sql', { 
      sql: createContractsSQL 
    });

    if (createContractsError) {
      console.error('❌ Error creating facility_contracts table:', createContractsError);
    } else {
      console.log('✅ facility_contracts table created/verified');
    }

    // Create RLS policies
    console.log('🔒 Setting up RLS policies...');
    
    const rlsPolicies = [
      `ALTER TABLE facility_users ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE facility_contracts ENABLE ROW LEVEL SECURITY;`,
      `
        CREATE POLICY IF NOT EXISTS "Users can view facility users for their facility" ON facility_users
        FOR SELECT USING (
          facility_id IN (
            SELECT facility_id FROM profiles WHERE id = auth.uid()
          )
        );
      `,
      `
        CREATE POLICY IF NOT EXISTS "Users can manage facility users based on role" ON facility_users
        FOR ALL USING (
          facility_id IN (
            SELECT p.facility_id FROM profiles p 
            JOIN facility_users fu ON p.facility_id = fu.facility_id 
            WHERE p.id = auth.uid() 
            AND fu.user_id = auth.uid() 
            AND fu.role IN ('super_admin', 'admin')
          )
        );
      `,
      `
        CREATE POLICY IF NOT EXISTS "Users can view contracts for their facility" ON facility_contracts
        FOR SELECT USING (
          facility_id IN (
            SELECT facility_id FROM profiles WHERE id = auth.uid()
          )
        );
      `,
      `
        CREATE POLICY IF NOT EXISTS "Admins can manage contracts" ON facility_contracts
        FOR ALL USING (
          facility_id IN (
            SELECT p.facility_id FROM profiles p 
            JOIN facility_users fu ON p.facility_id = fu.facility_id 
            WHERE p.id = auth.uid() 
            AND fu.user_id = auth.uid() 
            AND fu.role IN ('super_admin', 'admin')
          )
        );
      `
    ];

    for (const policy of rlsPolicies) {
      const { error: policyError } = await adminSupabase.rpc('exec_sql', { 
        sql: policy 
      });
      
      if (policyError) {
        console.error('❌ Error creating policy:', policyError);
      }
    }

    console.log('✅ RLS policies setup complete');

    // Test a simple query
    console.log('🧪 Testing facility_users table...');
    const { data: testData, error: testError } = await adminSupabase
      .from('facility_users')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('❌ Error testing facility_users:', testError);
    } else {
      console.log('✅ facility_users table is working, rows:', testData.length);
    }

    console.log('🎉 Database debug complete!');

  } catch (error) {
    console.error('💥 Error debugging database:', error);
  }
}

debugDatabase();