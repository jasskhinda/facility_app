// Setup invoices table for professional billing system
// Run this script in browser console on the billing page to create the table

(async function setupInvoicesTable() {
  console.log('🏗️ SETTING UP INVOICES TABLE');
  console.log('============================');
  
  try {
    // Import Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabaseUrl = 'https://iyzipkwwtzeymbklkwkf.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5emlwa3d3dHpleW1ia2xrd2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NzE5MTMsImV4cCI6MjA0NzU0NzkxM30.OKuy-VBinPMhMJoTVpEe1KNjAYxMSjhLJmyqVDSRmPg';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n1️⃣ CHECKING EXISTING INVOICES TABLE');
    console.log('----------------------------------');
    
    // Check if invoices table exists by trying to query it
    const { data: existingInvoices, error: checkError } = await supabase
      .from('invoices')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Invoices table already exists');
      console.log(`   Found ${existingInvoices?.length || 0} existing records`);
      
      // Check table structure
      const { data: tableInfo } = await supabase
        .from('invoices')
        .select('*')
        .limit(1);
      
      if (tableInfo && tableInfo.length > 0) {
        console.log('📋 Table columns:', Object.keys(tableInfo[0]));
      }
      
    } else {
      console.log('❌ Invoices table does not exist');
      console.log('   Error:', checkError.message);
      console.log('\n⚠️ TABLE CREATION REQUIRED');
      console.log('   Please run the SQL script create-invoices-table.sql in Supabase SQL editor');
      console.log('   Or contact your database administrator to create the table');
    }

    console.log('\n2️⃣ TESTING TABLE ACCESS');
    console.log('-----------------------');
    
    // Test if we can access the table (even if empty)
    const { data: testData, error: testError } = await supabase
      .from('invoices')
      .select('*')
      .limit(5);
    
    if (testError) {
      console.log('❌ Cannot access invoices table:', testError.message);
      console.log('   This is expected if the table does not exist');
    } else {
      console.log('✅ Successfully accessed invoices table');
      console.log(`   Current records: ${testData?.length || 0}`);
      
      if (testData && testData.length > 0) {
        console.log('📄 Sample record:', testData[0]);
      }
    }

    console.log('\n3️⃣ TESTING BILLING COMPONENT REQUIREMENTS');
    console.log('------------------------------------------');
    
    // Check if we have facilities and trips data needed for billing
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('id, name, billing_email')
      .limit(3);
    
    if (facilitiesError) {
      console.log('❌ Cannot access facilities table:', facilitiesError.message);
    } else {
      console.log(`✅ Found ${facilities?.length || 0} facilities`);
      if (facilities && facilities.length > 0) {
        facilities.forEach(facility => {
          console.log(`   - ${facility.name} (${facility.billing_email || 'no email'})`);
        });
      }
    }
    
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status')
      .not('price', 'is', null)
      .gt('price', 0)
      .limit(5);
    
    if (tripsError) {
      console.log('❌ Cannot access trips table:', tripsError.message);
    } else {
      console.log(`✅ Found ${trips?.length || 0} billable trips (sample)`);
    }

    console.log('\n4️⃣ SETUP SUMMARY');
    console.log('----------------');
    
    if (!checkError) {
      console.log('🎉 INVOICES TABLE READY!');
      console.log('   ✅ Table exists and is accessible');
      console.log('   ✅ Professional billing system can be used');
      console.log('   ✅ Invoice sending functionality available');
      
      console.log('\n📝 NEXT STEPS:');
      console.log('   1. Visit /dashboard/billing page');
      console.log('   2. Select a month with trips');
      console.log('   3. Click "Send Invoice" button');
      console.log('   4. Test professional invoice workflow');
      
    } else {
      console.log('⚠️ SETUP REQUIRED');
      console.log('   ❌ Invoices table needs to be created');
      console.log('   ❌ Professional billing not yet available');
      
      console.log('\n📝 REQUIRED ACTIONS:');
      console.log('   1. Run create-invoices-table.sql in Supabase SQL editor');
      console.log('   2. Re-run this setup script to verify');
      console.log('   3. Then test the billing functionality');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
})();
