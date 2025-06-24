// Date Range Calculation Verification
// Test the corrected date logic for different months

function testDateCalculation(monthToFetch) {
  console.log(`\n🗓️  Testing month: ${monthToFetch}`);
  
  const [year, month] = monthToFetch.split('-');
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
  
  // Use proper date calculation to avoid invalid dates like June 31st
  const lastDayOfMonth = endDate.getDate();
  const startISO = `${year}-${month.padStart(2, '0')}-01T00:00:00.000Z`;
  const endISO = `${year}-${month.padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}T23:59:59.999Z`;
  
  console.log(`   Start Date: ${startISO}`);
  console.log(`   End Date: ${endISO}`);
  console.log(`   Days in month: ${lastDayOfMonth}`);
  console.log(`   Month name: ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  
  return { startISO, endISO, lastDayOfMonth };
}

// Test problematic months
console.log('🧪 DATE CALCULATION VERIFICATION');
console.log('Testing months with different day counts:');

testDateCalculation('2025-02'); // February (28 days in 2025)
testDateCalculation('2025-04'); // April (30 days)
testDateCalculation('2025-06'); // June (30 days) - The problematic one!
testDateCalculation('2025-07'); // July (31 days)
testDateCalculation('2025-09'); // September (30 days)
testDateCalculation('2025-12'); // December (31 days)

// Test leap year
testDateCalculation('2024-02'); // February 2024 (29 days - leap year)

console.log('\n✅ All date calculations should now be valid!');
console.log('❌ BEFORE: June would generate "2025-06-31T23:59:59.999Z" (INVALID)');
console.log('✅ AFTER: June generates "2025-06-30T23:59:59.999Z" (VALID)');
