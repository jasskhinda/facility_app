// BROWSER CONSOLE TEST - CLIENT NAME RESOLUTION
// Copy and paste this into the browser console on the billing page
// This will test if the client name resolution is working

console.log('🧪 CLIENT NAME RESOLUTION TEST');
console.log('===============================');

async function testClientNameResolution() {
  try {
    console.log('\n1️⃣ Testing API endpoint...');
    
    // Test the billing API directly
    const response = await fetch('/api/facility/trips-billing?year=2025&month=6');
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error:', data.error);
      return;
    }
    
    console.log(`✅ API returned ${data.bills?.length || 0} bills`);
    
    if (!data.bills || data.bills.length === 0) {
      console.log('ℹ️ No bills found for June 2025');
      console.log('Try changing the month/year or create some test trips');
      return;
    }
    
    console.log('\n2️⃣ Analyzing client names...');
    
    const clientNameStats = {
      unknown: 0,
      resolved: 0,
      fallback: 0,
      samples: []
    };
    
    data.bills.forEach((bill, index) => {
      const name = bill.client_name;
      
      if (name === 'Unknown Client') {
        clientNameStats.unknown++;
      } else if (name.includes('Client (') || name.includes('Client from')) {
        clientNameStats.fallback++;
        if (clientNameStats.samples.length < 3) {
          clientNameStats.samples.push(`Fallback: "${name}"`);
        }
      } else {
        clientNameStats.resolved++;
        if (clientNameStats.samples.length < 3) {
          clientNameStats.samples.push(`Resolved: "${name}"`);
        }
      }
    });
    
    console.log('\n📊 CLIENT NAME STATISTICS:');
    console.log(`✅ Properly resolved: ${clientNameStats.resolved}`);
    console.log(`🔄 Fallback names: ${clientNameStats.fallback}`);
    console.log(`❌ Unknown clients: ${clientNameStats.unknown}`);
    
    if (clientNameStats.samples.length > 0) {
      console.log('\n📋 Sample client names:');
      clientNameStats.samples.forEach(sample => console.log(`   ${sample}`));
    }
    
    console.log('\n3️⃣ Testing component rendering...');
    
    // Check if there are any elements displaying "Unknown Client"
    const unknownElements = document.querySelectorAll('*');
    let unknownFound = 0;
    
    unknownElements.forEach(el => {
      if (el.textContent && el.textContent.includes('Unknown Client')) {
        unknownFound++;
      }
    });
    
    console.log(`🔍 "Unknown Client" found in DOM: ${unknownFound} occurrences`);
    
    if (unknownFound === 0) {
      console.log('🎉 SUCCESS! No "Unknown Client" found in the interface!');
    } else {
      console.log('⚠️ Still some "Unknown Client" entries in the interface');
    }
    
    console.log('\n4️⃣ Overall assessment...');
    
    if (clientNameStats.unknown === 0 && unknownFound === 0) {
      console.log('🎉 PERFECT! Client name resolution is working completely!');
      console.log('✅ All clients have meaningful identifiers');
      console.log('✅ No "Unknown Client" entries anywhere');
    } else if (clientNameStats.unknown === 0) {
      console.log('✅ GOOD! API is providing client names, but some UI might need refresh');
      console.log('💡 Try refreshing the page or changing the month filter');
    } else {
      console.log('⚠️ Some improvements needed');
      console.log(`Still ${clientNameStats.unknown} unknown clients in API data`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('💡 Make sure you\'re on the billing page and logged in as a facility user');
  }
}

// Run the test
testClientNameResolution();

// Also provide a function to test again manually
window.testClientNames = testClientNameResolution;
console.log('\n💡 To run this test again, use: testClientNames()');
