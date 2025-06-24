// BROWSER CONSOLE TEST - MANAGED CLIENTS DEBUG
// Copy and paste this into the browser console on the billing page

console.log('🔍 MANAGED CLIENTS DEBUG TEST');
console.log('==============================');

async function debugManagedClients() {
  try {
    console.log('\n1️⃣ Testing billing API to see managed client resolution...');
    
    const response = await fetch('/api/facility/trips-billing?year=2025&month=6');
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', data.error);
      return;
    }
    
    console.log(`✅ API returned ${data.bills?.length || 0} bills`);
    
    if (!data.bills || data.bills.length === 0) {
      console.log('ℹ️ No bills found for June 2025');
      return;
    }
    
    console.log('\n2️⃣ Analyzing managed client names...');
    
    const managedClientBills = data.bills.filter(bill => 
      bill.client_name.includes('Managed Client (') || 
      bill.client_name.includes('(Managed)')
    );
    
    console.log(`Found ${managedClientBills.length} managed client bills`);
    
    managedClientBills.forEach((bill, index) => {
      if (index < 5) { // Show first 5
        console.log(`Managed Bill ${index + 1}:`, {
          client_name: bill.client_name,
          client_id: bill.client_id,
          bill_number: bill.bill_number,
          pickup_address: bill.pickup_address?.substring(0, 30) + '...'
        });
      }
    });
    
    console.log('\n3️⃣ Direct managed_clients table test...');
    
    // Try to fetch managed clients directly
    const managedResponse = await fetch('/api/test-managed-clients');
    if (managedResponse.ok) {
      const managedData = await managedResponse.json();
      console.log('✅ Managed clients data:', managedData);
    } else {
      console.log('⚠️ No direct managed clients API available');
      
      // Let's create a quick test by calling the billing API in debug mode
      console.log('Creating manual check...');
      
      // Check the browser network tab for the billing API call
      console.log('💡 Check the Network tab for the billing API call to see server logs');
      console.log('Look for "CLIENT NAME RESOLUTION DEBUG" in the server console');
    }
    
    console.log('\n4️⃣ Recommendations:');
    
    if (managedClientBills.length > 0) {
      console.log('✅ Found managed client entries - the system is detecting them');
      console.log('🔍 Issue: managed_clients table may be missing records or have different column names');
      console.log('💡 Solutions:');
      console.log('   1. Check if managed_clients table exists and has data');
      console.log('   2. Verify column names (first_name, last_name, name, client_name)');
      console.log('   3. Ensure the managed_client_id values in trips match the id values in managed_clients');
    } else {
      console.log('ℹ️ No managed client entries found in current data');
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the test
debugManagedClients();

// Provide manual test function
window.debugManagedClients = debugManagedClients;
console.log('\n💡 To run this test again, use: debugManagedClients()');
