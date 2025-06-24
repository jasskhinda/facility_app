// BROWSER TEST: Verify Client Names Match Booking Page Format
// Copy and paste this into the browser console on the billing page

console.log('🎯 CLIENT NAME FORMAT VERIFICATION TEST');
console.log('========================================');

async function verifyClientNameFormat() {
  try {
    // Check if we're on the billing page
    const currentUrl = window.location.href;
    if (!currentUrl.includes('billing')) {
      console.log('⚠️ Please navigate to the billing page first');
      return;
    }
    
    console.log('🔍 Testing client name format on billing page...');
    
    // Look for client names in the billing table
    const tableRows = document.querySelectorAll('table tr');
    const clientNames = [];
    
    tableRows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        // Typically the second cell contains the client name
        const clientNameCell = cells[1];
        if (clientNameCell && clientNameCell.textContent.trim()) {
          const clientName = clientNameCell.textContent.trim();
          if (clientName !== 'Client' && !clientName.includes('Date')) {
            clientNames.push(clientName);
          }
        }
      }
    });
    
    console.log(`\n📋 Found ${clientNames.length} client names in billing table:`);
    
    if (clientNames.length === 0) {
      console.log('❌ No client names found in table');
      console.log('💡 Make sure the billing page has loaded with trip data');
      return;
    }
    
    // Analyze the format of client names
    const formatAnalysis = {
      withPhone: [],
      withoutPhone: [],
      managed: [],
      unknown: [],
      fallback: []
    };
    
    clientNames.slice(0, 10).forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
      
      // Categorize the name format
      if (name.includes(' - (') && name.includes(')')) {
        formatAnalysis.withPhone.push(name);
      } else if (name.includes('(Managed)')) {
        formatAnalysis.managed.push(name);
      } else if (name.includes('Unknown Client')) {
        formatAnalysis.unknown.push(name);
      } else if (name.includes('Client (') || name.includes('from ')) {
        formatAnalysis.fallback.push(name);
      } else {
        formatAnalysis.withoutPhone.push(name);
      }
    });
    
    console.log('\n📊 FORMAT ANALYSIS:');
    console.log(`✅ Names with phone (target format): ${formatAnalysis.withPhone.length}`);
    console.log(`📱 Managed clients: ${formatAnalysis.managed.length}`);
    console.log(`👤 Names without phone: ${formatAnalysis.withoutPhone.length}`);
    console.log(`❌ Unknown clients: ${formatAnalysis.unknown.length}`);
    console.log(`🔄 Fallback names: ${formatAnalysis.fallback.length}`);
    
    // Show examples of the target format
    if (formatAnalysis.withPhone.length > 0) {
      console.log('\n✅ CORRECT FORMAT EXAMPLES:');
      formatAnalysis.withPhone.slice(0, 3).forEach(name => {
        console.log(`  ✅ "${name}"`);
      });
    }
    
    // Show managed clients that might need phone numbers
    if (formatAnalysis.managed.length > 0) {
      console.log('\n🔄 MANAGED CLIENTS (may need phone numbers):');
      formatAnalysis.managed.slice(0, 3).forEach(name => {
        console.log(`  📱 "${name}"`);
      });
    }
    
    // Success criteria
    const totalDesiredFormat = formatAnalysis.withPhone.length + formatAnalysis.managed.length + formatAnalysis.withoutPhone.length;
    const successRate = totalDesiredFormat / clientNames.length * 100;
    
    console.log('\n🎯 SUCCESS CRITERIA:');
    console.log(`📈 Desired format rate: ${successRate.toFixed(1)}%`);
    
    if (formatAnalysis.unknown.length === 0 && successRate >= 90) {
      console.log('🎉 SUCCESS! Client names are properly formatted');
      console.log('✅ No "Unknown Client" entries found');
      console.log('✅ Names match or exceed booking page format');
    } else if (formatAnalysis.unknown.length > 0) {
      console.log('⚠️ ISSUE: Still have "Unknown Client" entries');
      console.log('💡 Check API logs for client name resolution debugging');
    } else {
      console.log('⚠️ ISSUE: Client name format needs improvement');
      console.log('💡 More clients should include phone numbers');
    }
    
    // Test specific format: "David Patel (Managed) - (416) 555-2233"
    const targetExample = formatAnalysis.withPhone.find(name => 
      name.includes('(Managed)') && name.includes(' - (')
    );
    
    if (targetExample) {
      console.log('\n🎯 PERFECT EXAMPLE FOUND:');
      console.log(`✅ "${targetExample}"`);
      console.log('🎉 This matches the exact booking page format!');
    } else {
      console.log('\n🔍 TARGET FORMAT NOT YET ACHIEVED:');
      console.log('🎯 Looking for: "Name (Managed) - (Phone)"');
      console.log('💡 API may need more phone number data');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
verifyClientNameFormat();

// Make the function available for re-running
window.verifyClientNameFormat = verifyClientNameFormat;
console.log('\n💡 Run verifyClientNameFormat() to test again');
