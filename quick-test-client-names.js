#!/usr/bin/env node

// QUICK TEST SCRIPT FOR CLIENT NAME RESOLUTION FIX
// ================================================

require('dotenv').config({ path: '.env.local' });

console.log('🧪 QUICK CLIENT NAME RESOLUTION TEST');
console.log('====================================');

async function quickTest() {
  console.log('\n1️⃣ Testing database connection...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test basic connection
    const { data, error } = await supabase
      .from('trips')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Test trips data
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, user_id, pickup_address')
      .eq('facility_id', 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3')
      .limit(5);
    
    if (tripsError) {
      console.log('❌ Trips query failed:', tripsError.message);
      return;
    }
    
    console.log(`✅ Found ${trips.length} facility trips`);
    
    const managedTrips = trips.filter(t => t.managed_client_id);
    const userTrips = trips.filter(t => t.user_id);
    
    console.log(`📊 Breakdown: ${managedTrips.length} managed clients, ${userTrips.length} user clients`);
    
    if (managedTrips.length > 0) {
      console.log('\n2️⃣ Testing managed client resolution...');
      
      const sampleTrip = managedTrips[0];
      console.log(`🔍 Sample trip: ${sampleTrip.id.slice(0, 8)}...`);
      console.log(`🔍 Managed client ID: ${sampleTrip.managed_client_id.slice(0, 8)}...`);
      console.log(`🔍 Pickup address: ${sampleTrip.pickup_address.substring(0, 50)}...`);
      
      // Test enhanced fallback logic
      const shortId = sampleTrip.managed_client_id.slice(0, 8);
      let locationIdentifier = 'Client';
      
      if (sampleTrip.pickup_address) {
        const addressParts = sampleTrip.pickup_address.split(',');
        const firstPart = addressParts[0].replace(/^\d+\s+/, '').trim();
        const words = firstPart.split(' ').filter(w => w.length > 2);
        
        if (words.length > 0) {
          locationIdentifier = words.slice(0, 2).join(' ');
        }
      }
      
      const enhancedFallback = `${locationIdentifier} Client (Managed) - ${shortId}`;
      console.log(`🔧 Enhanced fallback would be: "${enhancedFallback}"`);
    }
    
    console.log('\n3️⃣ Testing API endpoint...');
    
    try {
      const response = await fetch('http://localhost:3000/api/facility/trips-billing?limit=3');
      
      if (!response.ok) {
        console.log('⚠️ API endpoint not accessible - server may not be running');
        console.log('💡 Start with: npm run dev');
        return;
      }
      
      const data = await response.json();
      console.log('✅ API endpoint accessible');
      console.log(`📊 Found ${data.bills.length} bills`);
      
      if (data.bills.length > 0) {
        console.log('\n📋 Sample client names:');
        data.bills.slice(0, 3).forEach((bill, index) => {
          console.log(`  ${index + 1}. "${bill.client_name}"`);
        });
        
        // Analyze quality
        const properNames = data.bills.filter(bill => 
          bill.client_name.match(/^[A-Z][a-z]+ [A-Z][a-z]+ \(Managed\)/) ||
          bill.client_name.match(/^[A-Z][a-z]+ [A-Z][a-z]+ -/)
        ).length;
        
        const enhancedFallbacks = data.bills.filter(bill => 
          bill.client_name.includes('Client (Managed)') && 
          !bill.client_name.startsWith('Managed Client')
        ).length;
        
        const basicFallbacks = data.bills.filter(bill => 
          bill.client_name.includes('Managed Client (') ||
          bill.client_name === 'Unknown Client'
        ).length;
        
        const successRate = ((properNames + enhancedFallbacks) / data.bills.length * 100);
        
        console.log(`\n📊 Quality Analysis:`);
        console.log(`✅ Proper names: ${properNames}`);
        console.log(`🔄 Enhanced fallbacks: ${enhancedFallbacks}`);
        console.log(`❌ Basic fallbacks: ${basicFallbacks}`);
        console.log(`🎯 Success rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 80) {
          console.log('🎉 EXCELLENT - Client name resolution is working great!');
        } else if (successRate >= 60) {
          console.log('🟡 GOOD - Most names resolved, some room for improvement');
          console.log('💡 Consider running: node setup-managed-clients-fix.js');
        } else {
          console.log('🔴 NEEDS WORK - Many names still showing basic fallbacks');
          console.log('💡 Run: node setup-managed-clients-fix.js');
        }
      }
      
    } catch (fetchError) {
      console.log('⚠️ Could not test API endpoint:', fetchError.message);
      console.log('💡 Make sure server is running: npm run dev');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

console.log('\n🚀 INSTRUCTIONS:');
console.log('1. Ensure server is running: npm run dev');
console.log('2. For best results, first run: node setup-managed-clients-fix.js');
console.log('3. Then run this test to verify the fix is working');
console.log('');

quickTest().catch(console.error);
