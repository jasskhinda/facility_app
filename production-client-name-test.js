// PRODUCTION SITE CLIENT NAME FORMAT TEST
// Copy and paste this into browser console on: 
// https://facility.compassionatecaretransportation.com/dashboard/billing

console.log('🎯 PRODUCTION CLIENT NAME FORMAT TEST');
console.log('=====================================');
console.log('Site: https://facility.compassionatecaretransportation.com/dashboard/billing');

function testProductionClientNames() {
  console.log('\n🔍 Testing client names on production billing page...');
  
  // Method 1: Check billing table for client names
  const tableRows = document.querySelectorAll('table tr, .billing-row, [data-testid*="trip"], [data-testid*="bill"]');
  console.log(`Found ${tableRows.length} table rows to examine`);
  
  const clientNames = [];
  const issues = [];
  
  // Extract client names from various possible locations
  tableRows.forEach((row, index) => {
    const cells = row.querySelectorAll('td, .cell, .client-name');
    
    cells.forEach(cell => {
      const text = cell.textContent?.trim();
      if (text && text.length > 3 && !text.includes('$') && !text.includes('Date')) {
        // Looks like it could be a client name
        if (text.includes('David Patel') || text.includes('(Managed)') || text.includes('Client') || text.includes(' - (')) {
          clientNames.push(text);
        } else if (text.includes('Unknown')) {
          issues.push(text);
        }
      }
    });
  });
  
  // Method 2: Check for specific elements
  const specificSelectors = [
    '[data-client-name]',
    '.client-name',
    '.bill-client',
    'td:nth-child(2)', // Often the client column
    '.font-medium' // Often used for client names
  ];
  
  specificSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && (text.includes('David Patel') || text.includes('(Managed)') || text.includes(' - ('))) {
        clientNames.push(text);
      }
    });
  });
  
  // Remove duplicates
  const uniqueClientNames = [...new Set(clientNames)];
  const uniqueIssues = [...new Set(issues)];
  
  console.log('\n📋 FOUND CLIENT NAMES:');
  if (uniqueClientNames.length === 0) {
    console.log('❌ No client names found');
    console.log('💡 The billing page might not have loaded yet or uses different HTML structure');
    
    // Try to find any text that looks like names
    const allText = Array.from(document.querySelectorAll('*'))
      .map(el => el.textContent?.trim())
      .filter(text => text && text.length > 5 && text.length < 100)
      .filter(text => text.includes(' ') && !text.includes('$'))
      .slice(0, 10);
    
    console.log('🔍 Sample text content found:', allText);
    
  } else {
    uniqueClientNames.forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
      
      // Analyze format
      if (name.includes(' - (') && name.includes(')')) {
        console.log('    ✅ HAS PHONE NUMBER (correct format)');
      }
      if (name.includes('(Managed)')) {
        console.log('    ✅ MANAGED CLIENT LABELED');
      }
      if (name.includes('David Patel')) {
        console.log('    🎯 TARGET CLIENT FOUND');
      }
    });
  }
  
  if (uniqueIssues.length > 0) {
    console.log('\n⚠️ POTENTIAL ISSUES:');
    uniqueIssues.forEach(issue => {
      console.log(`  ❌ "${issue}"`);
    });
  }
  
  // Method 3: Check API calls in network tab
  console.log('\n🌐 CHECKING FOR API CALLS...');
  
  // Look for any fetch requests to billing API
  if (window.performance && window.performance.getEntriesByType) {
    const networkEntries = window.performance.getEntriesByType('resource');
    const apiCalls = networkEntries.filter(entry => 
      entry.name.includes('trips-billing') || 
      entry.name.includes('/api/facility') ||
      entry.name.includes('billing')
    );
    
    if (apiCalls.length > 0) {
      console.log(`✅ Found ${apiCalls.length} relevant API calls:`);
      apiCalls.forEach(call => {
        console.log(`  - ${call.name}`);
      });
    } else {
      console.log('⚠️ No billing API calls found in network log');
    }
  }
  
  // Method 4: Try to trigger a fresh API call
  console.log('\n🔄 ATTEMPTING TO FETCH FRESH DATA...');
  
  // Look for month dropdown to trigger refresh
  const monthDropdown = document.querySelector('select');
  if (monthDropdown) {
    console.log('✅ Found month dropdown, current value:', monthDropdown.value);
    console.log('💡 Try changing the month to trigger fresh data load');
  } else {
    console.log('⚠️ No month dropdown found');
  }
  
  // Final assessment
  console.log('\n🎯 ASSESSMENT:');
  
  const hasCorrectFormat = uniqueClientNames.some(name => 
    name.includes('(Managed)') && name.includes(' - (')
  );
  
  const hasUnknownClients = uniqueIssues.some(issue => 
    issue.toLowerCase().includes('unknown')
  );
  
  if (hasCorrectFormat) {
    console.log('🎉 SUCCESS: Found correctly formatted client names!');
    console.log('✅ Format includes "(Managed)" and phone numbers');
  } else if (uniqueClientNames.length > 0) {
    console.log('⚠️ PARTIAL: Found client names but format may need improvement');
  } else {
    console.log('❌ NO DATA: Could not find client names in billing table');
    console.log('💡 Page may still be loading or have different structure');
  }
  
  if (hasUnknownClients) {
    console.log('⚠️ ISSUE: Still seeing "Unknown Client" entries');
  } else {
    console.log('✅ GOOD: No "Unknown Client" entries detected');
  }
  
  return {
    clientNames: uniqueClientNames,
    issues: uniqueIssues,
    hasCorrectFormat,
    hasUnknownClients
  };
}

// Run the test
const result = testProductionClientNames();

// Make function available for re-running
window.testProductionClientNames = testProductionClientNames;

console.log('\n💡 To run again: testProductionClientNames()');
console.log('🎯 GOAL: See "David Patel (Managed) - (416) 555-2233" format');
