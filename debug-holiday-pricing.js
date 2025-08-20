// Debug Holiday Pricing Issue
// Run this in the browser console to test holiday detection

console.log('🎯 DEBUGGING HOLIDAY PRICING ISSUE');
console.log('=====================================');

// Test Christmas Day 2025
const testDate = '2025-12-25T10:00';
console.log(`\n📅 Testing date: ${testDate}`);

// Test the holiday detection directly
try {
  // Parse the date like the component does
  const date = new Date(testDate);
  const year = date.getFullYear();
  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  console.log('📊 Date parsing:');
  console.log(`   Original: ${testDate}`);
  console.log(`   Parsed: ${date.toString()}`);
  console.log(`   Year: ${year}`);
  console.log(`   Month-Day: ${monthDay}`);
  console.log(`   Valid: ${!isNaN(date.getTime())}`);
  
  // Check if it matches Christmas
  const isChristmas = monthDay === '12-25';
  console.log(`\n🎄 Christmas check: ${isChristmas ? 'YES' : 'NO'}`);
  
  // Test the fixed holidays array
  const US_FEDERAL_HOLIDAYS = [
    { name: "New Year's Day", date: "01-01", surcharge: 100, federal: true },
    { name: "Independence Day", date: "07-04", surcharge: 100, federal: true },
    { name: "Veterans Day", date: "11-11", surcharge: 100, federal: true },
    { name: "Christmas Day", date: "12-25", surcharge: 100, federal: true },
    { name: "New Year's Eve", date: "12-31", surcharge: 100, federal: false },
    { name: "Christmas Eve", date: "12-24", surcharge: 100, federal: false }
  ];
  
  const fixedHoliday = US_FEDERAL_HOLIDAYS.find(holiday => !holiday.isVariable && holiday.date === monthDay);
  console.log(`\n🔍 Fixed holiday search result:`, fixedHoliday);
  
  if (fixedHoliday) {
    console.log('✅ Holiday detected successfully!');
    console.log(`   Name: ${fixedHoliday.name}`);
    console.log(`   Surcharge: $${fixedHoliday.surcharge}`);
    console.log(`   Federal: ${fixedHoliday.federal}`);
  } else {
    console.log('❌ No holiday detected - this is the problem!');
  }
  
} catch (error) {
  console.error('💥 Error during test:', error);
}

console.log('\n🔧 NEXT STEPS:');
console.log('1. Check if HolidayPricingChecker component is being rendered');
console.log('2. Check if onHolidayChange callback is being called');
console.log('3. Check if pricing calculation receives holiday data');
console.log('4. Check browser console for any errors');
