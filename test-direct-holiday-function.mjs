// Comprehensive Holiday Detection Test
// This script directly tests the checkHolidaySurcharge function

import { checkHolidaySurcharge } from './app/components/HolidayPricingChecker.js';

console.log('🎯 DIRECT HOLIDAY FUNCTION TEST');
console.log('================================\n');

// Test dates for 2025
const testCases = [
  { date: '2025-01-01T10:00', expected: true, name: 'New Year\'s Day' },
  { date: '2025-01-20T10:00', expected: true, name: 'MLK Day (3rd Monday)' },
  { date: '2025-02-17T10:00', expected: true, name: 'Presidents Day (3rd Monday)' },
  { date: '2025-07-04T10:00', expected: true, name: 'Independence Day' },
  { date: '2025-11-27T10:00', expected: true, name: 'Thanksgiving (4th Thursday)' },
  { date: '2025-11-28T10:00', expected: true, name: 'Black Friday' },
  { date: '2025-12-24T10:00', expected: true, name: 'Christmas Eve' },
  { date: '2025-12-25T10:00', expected: true, name: 'Christmas Day' },
  { date: '2025-12-31T10:00', expected: true, name: 'New Year\'s Eve' },
  { date: '2025-08-20T10:00', expected: false, name: 'Regular Wednesday' },
  { date: '2025-06-15T10:00', expected: false, name: 'Regular Sunday' },
];

console.log('Testing checkHolidaySurcharge function...\n');

testCases.forEach((test, index) => {
  console.log(`${index + 1}. Testing: ${test.name} (${test.date})`);
  
  try {
    const result = checkHolidaySurcharge(test.date);
    const passed = result.isHoliday === test.expected;
    const emoji = passed ? '✅' : '❌';
    
    console.log(`   ${emoji} Result: ${result.isHoliday ? 'HOLIDAY' : 'Regular Day'}`);
    if (result.isHoliday) {
      console.log(`   💰 Surcharge: $${result.surcharge}`);
      console.log(`   🏛️  Federal: ${result.isFederal || false}`);
    }
    console.log(`   🎯 Expected: ${test.expected ? 'HOLIDAY' : 'Regular Day'} - ${passed ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
  }
  
  console.log('');
});

console.log('🔍 Additional Debugging...');
console.log('==========================\n');

// Test date parsing
const sampleDate = '2025-12-25T10:00';
console.log(`Sample date string: ${sampleDate}`);
console.log(`Parsed as Date: ${new Date(sampleDate)}`);
console.log(`Year: ${new Date(sampleDate).getFullYear()}`);
console.log(`Month: ${new Date(sampleDate).getMonth() + 1}`);
console.log(`Day: ${new Date(sampleDate).getDate()}`);

const monthDay = `${String(new Date(sampleDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(sampleDate).getDate()).padStart(2, '0')}`;
console.log(`Month-Day format: ${monthDay}`);
console.log(`Expected: 12-25 - ${monthDay === '12-25' ? 'MATCH' : 'NO MATCH'}`);
