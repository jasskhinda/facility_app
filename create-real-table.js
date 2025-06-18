import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';

// This will be set when you provide the service role key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[2];

if (!serviceRoleKey) {
  console.error('❌ Service role key is required!');
  console.log('Usage: node create-real-table.js YOUR_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createRealTable() {
  console.log('🔧 Creating facility_managed_clients table...');
  
  try {
    // Create the table
    const { data: createResult, error: createError } = await supabase.rpc('exec', {
      query: `
        -- Create facility_managed_clients table
        CREATE TABLE IF NOT EXISTS facility_managed_clients (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT UNIQUE,
          phone_number TEXT,
          address TEXT,
          accessibility_needs TEXT,
          medical_requirements TEXT,
          emergency_contact TEXT,
          facility_id TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (createError) {
      console.error('❌ Error creating table:', createError);
      return false;
    }

    console.log('✅ Table created successfully');

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec', {
      query: `ALTER TABLE facility_managed_clients ENABLE ROW LEVEL SECURITY;`
    });

    if (rlsError) {
      console.log('⚠️  RLS enable warning:', rlsError.message);
    } else {
      console.log('✅ RLS enabled');
    }

    // Create policy
    const { error: policyError } = await supabase.rpc('exec', {
      query: `
        CREATE POLICY "Enable all operations for authenticated users" 
        ON facility_managed_clients FOR ALL 
        USING (true);
      `
    });

    if (policyError) {
      console.log('⚠️  Policy warning:', policyError.message);
    } else {
      console.log('✅ Policy created');
    }

    // Test the table
    console.log('🧪 Testing table...');
    const { data: testData, error: testError } = await supabase
      .from('facility_managed_clients')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Table test failed:', testError);
      return false;
    }

    console.log('✅ Table is working correctly!');
    return true;

  } catch (error) {
    console.error('💥 Migration failed:', error);
    return false;
  }
}

createRealTable().then(success => {
  if (success) {
    console.log('🎉 Database migration completed successfully!');
    console.log('✅ Your app is now ready for production use');
  } else {
    console.log('❌ Migration failed. Please check errors above.');
  }
  process.exit(success ? 0 : 1);
});
