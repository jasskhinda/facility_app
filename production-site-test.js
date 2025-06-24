// 🔍 PRODUCTION SITE CLIENT NAME TEST
// Copy and paste this into browser console on https://facility.compassionatecaretransportation.com/dashboard/billing

console.log('🔍 TESTING CLIENT NAMES ON PRODUCTION SITE');
console.log('==========================================');

// Test what we're currently seeing vs what we should see
function analyzeClientNames() {
  console.log('\n📋 CURRENT CLIENT NAMES ON PRODUCTION:');
  
  // Look for client names in the billing table
  const tableRows = document.querySelectorAll('table tbody tr');
  const clientNames = [];
  
  tableRows.forEach((row, index) => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 2) {
      const clientNameCell = cells[1]; // Second column is client name
      if (clientNameCell) {
        const clientName = clientNameCell.textContent.trim();
        if (clientName && !clientName.includes('Date') && !clientName.includes('Client')) {
          clientNames.push(clientName);
          console.log(`  ${index + 1}. "${clientName}"`);
        }
      }
    }
  });
  
  console.log('\n📊 ANALYSIS:');
  
  const analysis = {
    fallbackNames: [],
    unknownClients: [],
    properNames: []
  };
  
  clientNames.forEach(name => {
    if (name.includes('Managed Client (')) {
      analysis.fallbackNames.push(name);
    } else if (name.includes('Unknown Client')) {
      analysis.unknownClients.push(name);
    } else if (name.includes('Client from')) {
      analysis.fallbackNames.push(name);
    } else {
      analysis.properNames.push(name);
    }
  });
  
  console.log(`❌ Fallback names: ${analysis.fallbackNames.length}`);
  console.log(`❌ Unknown clients: ${analysis.unknownClients.length}`);
  console.log(`✅ Proper names: ${analysis.properNames.length}`);
  
  if (analysis.fallbackNames.length > 0) {
    console.log('\n🔍 FALLBACK NAMES FOUND (indicates old code):');
    analysis.fallbackNames.slice(0, 5).forEach(name => {
      console.log(`  ❌ "${name}"`);
    });
  }
  
  console.log('\n🎯 WHAT WE SHOULD SEE AFTER DEPLOYMENT:');
  console.log('  ✅ "David Patel (Managed) - (416) 555-2233"');
  console.log('  ✅ "Maria Rodriguez (Managed) - (647) 555-9876"');
  console.log('  ✅ "John Smith - (614) 555-0123"');
  
  console.log('\n🚀 CONCLUSION:');
  if (analysis.fallbackNames.length > 0 || analysis.unknownClients.length > 0) {
    console.log('❌ PRODUCTION SITE NEEDS DEPLOYMENT');
    console.log('💡 The updated code with client name fixes has not been deployed yet');
    console.log('📤 Need to deploy the latest code to production');
  } else {
    console.log('✅ PRODUCTION SITE IS UP TO DATE');
    console.log('🎉 Client names are properly formatted');
  }
}

// Test if the API has been updated
async function testProductionAPI() {
  console.log('\n🔍 TESTING PRODUCTION API...');
  
  try {
    // Test the billing API endpoint
    const response = await fetch('/api/facility/trips-billing?year=2025&month=6');
    const data = await response.json();
    
    if (data.bills && data.bills.length > 0) {
      console.log(`📊 API returned ${data.bills.length} bills`);
      
      const sampleBill = data.bills[0];
      console.log('Sample client name from API:', `"${sampleBill.client_name}"`);
      
      if (sampleBill.client_name.includes('Managed Client (')) {
        console.log('❌ API still returning fallback names - needs deployment');
      } else if (sampleBill.client_name.includes(' - (') && sampleBill.client_name.includes('(Managed)')) {
        console.log('✅ API returning proper format with phone numbers');
      } else {
        console.log('⚠️ API returning names but not in expected format');
      }
    } else {
      console.log('❌ No billing data returned from API');
    }
  } catch (error) {
    console.log('❌ Error testing API:', error.message);
  }
}

// Run both tests
analyzeClientNames();
testProductionAPI();

console.log('\n💡 Run this test again after deployment to verify the fix');
