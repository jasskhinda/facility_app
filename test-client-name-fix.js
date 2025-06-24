#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testClientNameResolution() {
  console.log('🧪 TESTING CLIENT NAME RESOLUTION FIX');
  console.log('====================================');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    // 1. Test direct API call to the billing endpoint
    console.log('\n1️⃣ Testing billing API directly...');
    
    try {
      const response = await fetch('http://localhost:3000/api/facility/trips-billing');
      
      if (!response.ok) {
        console.log('❌ API call failed:', response.status, response.statusText);
        console.log('💡 Make sure the development server is running: npm run dev');
        return;
      }
      
      const data = await response.json();
      
      console.log(`✅ API call successful - found ${data.bills.length} bills`);
      
      // Analyze client name quality
      const clientNames = data.bills.map(bill => bill.client_name);
      const nameAnalysis = analyzeClientNames(clientNames);
      
      console.log('\n📊 CLIENT NAME ANALYSIS:');
      console.log(`Total bills: ${data.bills.length}`);
      console.log(`✅ Properly resolved: ${nameAnalysis.proper} (${nameAnalysis.properPercent}%)`);
      console.log(`🔄 Enhanced fallbacks: ${nameAnalysis.enhanced} (${nameAnalysis.enhancedPercent}%)`);
      console.log(`❌ Basic fallbacks: ${nameAnalysis.basic} (${nameAnalysis.basicPercent}%)`);
      console.log(`❌ Unknown: ${nameAnalysis.unknown} (${nameAnalysis.unknownPercent}%)`);
      
      // Show examples
      if (nameAnalysis.properExamples.length > 0) {
        console.log('\n✅ Properly resolved examples:');
        nameAnalysis.properExamples.slice(0, 3).forEach((name, i) => {
          console.log(`  ${i + 1}. ${name}`);
        });
      }
      
      if (nameAnalysis.enhancedExamples.length > 0) {
        console.log('\n🔄 Enhanced fallback examples:');
        nameAnalysis.enhancedExamples.slice(0, 3).forEach((name, i) => {
          console.log(`  ${i + 1}. ${name}`);
        });
      }
      
      if (nameAnalysis.basicExamples.length > 0) {
        console.log('\n❌ Basic fallback examples (need improvement):');
        nameAnalysis.basicExamples.slice(0, 3).forEach((name, i) => {
          console.log(`  ${i + 1}. ${name}`);
        });
      }
      
      // Overall success rating
      const successRate = nameAnalysis.properPercent + nameAnalysis.enhancedPercent;
      console.log(`\n🎯 OVERALL SUCCESS RATE: ${successRate.toFixed(1)}%`);
      
      if (successRate >= 90) {
        console.log('🎉 EXCELLENT - Client name resolution is working great!');
      } else if (successRate >= 70) {
        console.log('🟡 GOOD - Most client names are resolved, some room for improvement');
      } else {
        console.log('🔴 NEEDS WORK - Many client names still showing as basic fallbacks');
        console.log('💡 Consider running: node setup-managed-clients-fix.js');
      }
      
    } catch (error) {
      console.log('❌ Error testing API:', error.message);
      console.log('💡 Make sure the development server is running on http://localhost:3000');
    }
    
    // 2. Test database queries directly
    console.log('\n2️⃣ Testing database queries directly...');
    
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, managed_client_id, user_id, pickup_address')
      .eq('facility_id', facilityId)
      .not('price', 'is', null)
      .limit(5);
    
    if (tripsError) {
      console.log('❌ Error fetching trips:', tripsError.message);
      return;
    }
    
    console.log(`✅ Found ${trips.length} facility trips`);
    
    // Check managed client resolution
    const managedTrips = trips.filter(t => t.managed_client_id);
    const userTrips = trips.filter(t => t.user_id);
    
    console.log(`📊 Trip breakdown: ${managedTrips.length} managed, ${userTrips.length} user`);
    
    if (managedTrips.length > 0) {
      console.log('\n3️⃣ Testing managed client resolution...');
      
      const managedClientIds = managedTrips.map(t => t.managed_client_id);
      
      // Try both tables
      const tables = ['facility_managed_clients', 'managed_clients'];
      
      for (const table of tables) {
        try {
          const { data: clients, error: clientError } = await supabase
            .from(table)
            .select('id, first_name, last_name, name, client_name, phone_number')
            .in('id', managedClientIds);
          
          if (!clientError && clients && clients.length > 0) {
            console.log(`✅ Found ${clients.length} clients in ${table}:`);
            clients.forEach((client, i) => {
              const name = client.first_name ? 
                `${client.first_name} ${client.last_name}` : 
                client.name || client.client_name || 'No name';
              const phone = client.phone_number ? ` - ${client.phone_number}` : '';
              console.log(`  ${i + 1}. ${name}${phone}`);
            });
          } else {
            console.log(`⚠️ No clients found in ${table}`);
          }
        } catch (e) {
          console.log(`❌ Cannot access ${table}: ${e.message}`);
        }
      }
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    
    if (successRate >= 90) {
      console.log('✅ System is working perfectly!');
      console.log('💡 No action needed - client names are properly resolved');
    } else if (successRate >= 70) {
      console.log('🟡 System is mostly working but could be improved');
      console.log('💡 Consider adding more managed client test data');
    } else {
      console.log('🔴 System needs improvement');
      console.log('💡 Run: node setup-managed-clients-fix.js');
      console.log('💡 Check server logs for detailed debugging information');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

function analyzeClientNames(clientNames) {
  let proper = 0;
  let enhanced = 0;
  let basic = 0;
  let unknown = 0;
  
  const properExamples = [];
  const enhancedExamples = [];
  const basicExamples = [];
  const unknownExamples = [];
  
  clientNames.forEach(name => {
    if (name === 'Unknown Client') {
      unknown++;
      unknownExamples.push(name);
    } else if (name.match(/^[A-Z][a-z]+ [A-Z][a-z]+ \(Managed\)/) || name.match(/^[A-Z][a-z]+ [A-Z][a-z]+ -/)) {
      // Proper names like "David Patel (Managed) - (416) 555-2233" or "John Smith - (416) 555-1234"
      proper++;
      properExamples.push(name);
    } else if (name.includes('Client (Managed)') || name.includes('(Managed)')) {
      // Enhanced fallbacks like "Main Street Client (Managed) - ea79223a"
      enhanced++;
      enhancedExamples.push(name);
    } else if (name.includes('Client (') || name.includes('Managed Client')) {
      // Basic fallbacks like "Facility Client (abcd1234)" or "Managed Client (ea79223a)"
      basic++;
      basicExamples.push(name);
    } else {
      // Other patterns
      proper++;
      properExamples.push(name);
    }
  });
  
  const total = clientNames.length;
  
  return {
    proper,
    enhanced,
    basic,
    unknown,
    properPercent: total > 0 ? (proper / total * 100) : 0,
    enhancedPercent: total > 0 ? (enhanced / total * 100) : 0,
    basicPercent: total > 0 ? (basic / total * 100) : 0,
    unknownPercent: total > 0 ? (unknown / total * 100) : 0,
    properExamples,
    enhancedExamples,
    basicExamples,
    unknownExamples
  };
}

testClientNameResolution();
