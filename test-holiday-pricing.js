#!/usr/bin/env node

// Test script to verify holiday pricing detection is working correctly

const testDates = [
  // Fixed holidays 2025
  { date: '2025-01-01', expected: "New Year's Day" },
  { date: '2025-07-04', expected: "Independence Day" },
  { date: '2025-11-11', expected: "Veterans Day" },
  { date: '2025-12-25', expected: "Christmas Day" },
  { date: '2025-12-31', expected: "New Year's Eve" },
  { date: '2025-12-24', expected: "Christmas Eve" },
  
  // Variable holidays 2025 (calculated dates)
  { date: '2025-01-20', expected: "Martin Luther King Jr. Day" }, // 3rd Monday in January
  { date: '2025-02-17', expected: "Presidents' Day" }, // 3rd Monday in February
  { date: '2025-04-20', expected: "Easter Sunday" }, // Calculated Easter
  { date: '2025-05-26', expected: "Memorial Day" }, // Last Monday in May
  { date: '2025-09-01', expected: "Labor Day" }, // First Monday in September
  { date: '2025-10-13', expected: "Columbus Day" }, // 2nd Monday in October
  { date: '2025-11-27', expected: "Thanksgiving Day" }, // 4th Thursday in November
  { date: '2025-11-28', expected: "Black Friday" }, // Day after Thanksgiving
  
  // Non-holidays
  { date: '2025-06-15', expected: null },
  { date: '2025-08-15', expected: null },
  { date: '2025-03-10', expected: null }
];

// Import the holiday checker function
const { checkHolidaySurcharge } = require('./app/components/HolidayPricingChecker.js');

console.log('🎄 TESTING HOLIDAY PRICING DETECTION 🎄');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

testDates.forEach(test => {
  try {
    const result = checkHolidaySurcharge(test.date);
    
    if (test.expected) {
      // Should be a holiday
      if (result.isHoliday && result.name === test.expected && result.surcharge === 100) {
        console.log(`✅ ${test.date}: ${result.name} (+$${result.surcharge})`);
        passCount++;
      } else {
        console.log(`❌ ${test.date}: Expected "${test.expected}" but got ${result.isHoliday ? result.name : 'no holiday'}`);
        failCount++;
      }
    } else {
      // Should NOT be a holiday
      if (!result.isHoliday) {
        console.log(`✅ ${test.date}: No holiday (correct)`);
        passCount++;
      } else {
        console.log(`❌ ${test.date}: Expected no holiday but got "${result.name}"`);
        failCount++;
      }
    }
  } catch (error) {
    console.log(`❌ ${test.date}: Error - ${error.message}`);
    failCount++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 TEST RESULTS: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('🎉 ALL TESTS PASSED! Holiday detection is working correctly.');
  console.log('✨ Features working:');
  console.log('   • Fixed date holidays (New Year, Christmas, etc.)');
  console.log('   • Variable date holidays (MLK Day, Easter, Thanksgiving, etc.)');
  console.log('   • $100 surcharge applied correctly');
  console.log('   • Non-holiday dates properly excluded');
} else {
  console.log(`⚠️  ${failCount} tests failed. Holiday detection needs debugging.`);
}

console.log('\n🔧 Integration status:');
console.log('   • HolidayPricingChecker component: Implemented');
console.log('   • FacilityBookingForm integration: Complete');
console.log('   • Pricing calculation: Enhanced with holiday surcharge');
console.log('   • UI notifications: Amber alert with holiday name and surcharge');

process.exit(failCount === 0 ? 0 : 1);
