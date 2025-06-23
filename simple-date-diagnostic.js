// SIMPLE DATE DIAGNOSTIC - No Supabase dependency
// Run this in browser console on the billing page

console.log('🔍 SIMPLE DATE DIAGNOSTIC');

// Check if we can access the React component state
function simpleDateDiagnostic() {
  console.log('Current date:', new Date().toISOString());
  console.log('Looking for June 2025 trips...');
  
  // Test the exact date logic from billing component
  const selectedMonth = '2025-06';
  console.log('Selected month:', selectedMonth);
  
  // Replicate the billing component's date calculation
  const startDate = new Date(selectedMonth + '-01');
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);
  
  console.log('Start date:', startDate.toISOString());
  console.log('End date:', endDate.toISOString());
  
  // Check for typical June 2025 dates
  const june24 = new Date('2025-06-24T13:15:00.000Z');
  const june28 = new Date('2025-06-28T10:00:00.000Z');
  
  console.log('June 24 trip date:', june24.toISOString());
  console.log('June 28 trip date:', june28.toISOString());
  
  console.log('Is June 24 in range?', june24 >= startDate && june24 <= endDate);
  console.log('Is June 28 in range?', june28 >= startDate && june28 <= endDate);
  
  // Check browser network tab
  console.log('\n🔍 NEXT STEPS:');
  console.log('1. Open Network tab in DevTools');
  console.log('2. Refresh billing page');
  console.log('3. Look for API calls to Supabase');
  console.log('4. Check the response data');
}

simpleDateDiagnostic();
