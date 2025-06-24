/**
 * Production Debug Script - Client Name Resolution Issue
 * Run this in browser console on the billing page to debug the API response
 */

async function debugProductionClientNames() {
  console.log('🔍 Debugging Production Client Name Resolution...\n');
  
  try {
    // Call the production API directly
    const response = await fetch('/api/facility/trips-billing', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ API Response received');
    console.log('📊 Total bills:', data.bills?.length || 0);
    
    if (!data.bills || data.bills.length === 0) {
      console.log('❌ No bills data received');
      return;
    }
    
    // Analyze client name patterns
    console.log('\n🔍 Client Name Analysis:');
    const clientNames = data.bills.map(bill => bill.client_name || 'NO_NAME');
    const uniqueNames = [...new Set(clientNames)];
    
    uniqueNames.forEach(name => {
      const count = clientNames.filter(n => n === name).length;
      console.log(`"${name}" - ${count} trips`);
    });
    
    // Check for the specific issue
    const problematicNames = data.bills.filter(bill => 
      bill.client_name && bill.client_name.includes('Managed Client (ea79223a)')
    );
    
    if (problematicNames.length > 0) {
      console.log('\n❌ Found problematic client names:');
      problematicNames.forEach((bill, index) => {
        console.log(`${index + 1}. Trip ID: ${bill.trip_id}`);
        console.log(`   Client Name: "${bill.client_name}"`);
        console.log(`   Client ID: ${bill.client_id}`);
        console.log(`   Route: ${bill.pickup_address} → ${bill.destination_address}`);
        console.log('');
      });
      
      console.log('🔍 This indicates the managed client record is not being found in facility_managed_clients table');
    }
    
    // Check for successful resolutions
    const successfulNames = data.bills.filter(bill => 
      bill.client_name && 
      bill.client_name.includes('(Managed)') && 
      !bill.client_name.includes('Managed Client (')
    );
    
    if (successfulNames.length > 0) {
      console.log('\n✅ Successfully resolved managed clients:');
      successfulNames.slice(0, 3).forEach((bill, index) => {
        console.log(`${index + 1}. "${bill.client_name}"`);
      });
    }
    
    // Check the server logs in Network tab
    console.log('\n💡 Next Steps:');
    console.log('1. Check Network tab for API call to see server console logs');
    console.log('2. Look for "CLIENT NAME RESOLUTION DEBUG" logs');
    console.log('3. Check if managed clients are being fetched from facility_managed_clients table');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugProductionClientNames();
