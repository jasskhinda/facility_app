// COMPREHENSIVE MANAGED CLIENT DIAGNOSTIC
// Copy and paste this into the browser console on the billing page

console.log('🔍 COMPREHENSIVE MANAGED CLIENT DIAGNOSTIC');
console.log('=========================================');

async function comprehensiveManagedClientTest() {
  try {
    console.log('\n1️⃣ Testing billing API with detailed logging...');
    
    const response = await fetch('/api/facility/trips-billing?year=2025&month=6');
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', data.error);
      return;
    }
    
    console.log(`✅ API returned ${data.bills?.length || 0} bills`);
    
    if (!data.bills || data.bills.length === 0) {
      console.log('ℹ️ No bills found - try different month/year');
      return;
    }
    
    console.log('\n2️⃣ Finding managed client entries...');
    
    const managedClientBills = data.bills.filter(bill => 
      bill.client_name.includes('Managed Client (') || 
      bill.client_name.includes('(Managed)') ||
      bill.client_name.includes('Client (ea79223a)')
    );
    
    console.log(`Found ${managedClientBills.length} managed client related bills`);
    
    managedClientBills.forEach((bill, index) => {
      console.log(`\nManaged Bill ${index + 1}:`);
      console.log(`  Client Name: "${bill.client_name}"`);
      console.log(`  Client ID: ${bill.client_id}`);
      console.log(`  Bill Number: ${bill.bill_number}`);
      console.log(`  Route: ${bill.pickup_address?.substring(0, 30)}... → ${bill.destination_address?.substring(0, 30)}...`);
      console.log(`  Amount: $${bill.amount}`);
    });
    
    console.log('\n3️⃣ Creating direct managed_clients table test...');
    
    // Test if we can create managed client data directly
    try {
      // This is a mock - in real scenario you'd need an API endpoint
      console.log('⚠️ To fix this issue, you need to either:');
      console.log('\nOPTION 1 - Add data to managed_clients table:');
      console.log('   1. Go to Supabase dashboard → SQL Editor');
      console.log('   2. Run the SQL from "add-managed-clients-test-data.sql"');
      console.log('   3. This will create test managed client records');
      
      console.log('\nOPTION 2 - Run the Node.js script:');
      console.log('   1. In terminal: cd "/Volumes/C/CCT APPS/facility_app"');
      console.log('   2. Run: node add-test-managed-clients.js');
      
      console.log('\nOPTION 3 - Use enhanced fallback (already implemented):');
      console.log('   The system now creates better fallback names from address data');
      
    } catch (error) {
      console.log('⚠️ Cannot test managed_clients table directly from browser');
    }
    
    console.log('\n4️⃣ Immediate temporary fix...');
    
    // Create a temporary fix by modifying the display
    const managedClientElements = document.querySelectorAll('*');
    let replacedCount = 0;
    
    managedClientElements.forEach(el => {
      if (el.textContent && el.textContent.includes('Managed Client (ea79223a)')) {
        const originalText = el.textContent;
        // Replace with a more meaningful name based on the route
        const newText = originalText.replace('Managed Client (ea79223a)', 'Dublin Client (ea79223a)');
        if (el.innerHTML && !el.innerHTML.includes('<')) {
          el.textContent = newText;
          replacedCount++;
        }
      }
    });
    
    if (replacedCount > 0) {
      console.log(`✅ Temporarily updated ${replacedCount} client name displays`);
      console.log('This is just a visual fix - refresh the page to see the permanent solution');
    }
    
    console.log('\n5️⃣ Summary and next steps...');
    
    console.log('🎯 ISSUE: Managed client ID exists but no matching record in managed_clients table');
    console.log('🔧 SOLUTION: Add managed client data to the database');
    console.log('📍 STATUS: Enhanced fallback implemented for better UX');
    
    console.log('\n✅ RECOMMENDED ACTION:');
    console.log('1. Run the SQL script to add test managed client data');
    console.log('2. Refresh the billing page');
    console.log('3. "Managed Client (ea79223a)" should become "John Smith (Managed)" or similar');
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
  }
}

// Run the test
comprehensiveManagedClientTest();

// Also provide manual test function
window.testManagedClients = comprehensiveManagedClientTest;
console.log('\n💡 To run this test again, use: testManagedClients()');
