#!/usr/bin/env node

// Live Holiday Debugging Script
// This script will test the actual holiday functionality as it appears in the booking form

const fs = require('fs');
const path = require('path');

console.log('🔍 LIVE HOLIDAY FUNCTIONALITY DEBUG');
console.log('=====================================\n');

// Test the HolidayPricingChecker component directly
try {
    const checkerPath = path.join(__dirname, 'app/components/HolidayPricingChecker.js');
    console.log('📄 Reading HolidayPricingChecker.js...');
    
    const checkerContent = fs.readFileSync(checkerPath, 'utf8');
    
    // Extract and test the export function
    const exportFunctionMatch = checkerContent.match(/export\s+function\s+checkHolidaySurcharge\s*\([^}]+\}/s);
    if (exportFunctionMatch) {
        console.log('✅ Found export function checkHolidaySurcharge');
        
        // Test with known holiday dates
        const testDates = [
            '2025-12-25', // Christmas Day
            '2025-01-01', // New Year's Day
            '2025-07-04', // Independence Day
            '2025-01-20', // MLK Day 2025 (3rd Monday in January)
            '2025-08-20', // Regular day (today)
            '2025-11-27', // Thanksgiving 2025 (4th Thursday in November)
        ];
        
        console.log('\n🗓️  Testing Holiday Dates:');
        console.log('==========================');
        
        testDates.forEach(dateStr => {
            console.log(`\n📅 Testing: ${dateStr}`);
            
            // Manual holiday check based on the logic in the component
            const date = new Date(dateStr);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const dayOfWeek = date.getDay();
            
            // Check fixed holidays
            const isFixedHoliday = (
                (month === 1 && day === 1) || // New Year's Day
                (month === 7 && day === 4) || // Independence Day
                (month === 11 && day === 11) || // Veterans Day
                (month === 12 && day === 25) || // Christmas Day
                (month === 12 && day === 24) || // Christmas Eve
                (month === 12 && day === 31)    // New Year's Eve
            );
            
            // Check variable holidays (simplified check)
            let isVariableHoliday = false;
            
            // MLK Day - 3rd Monday in January
            if (month === 1 && dayOfWeek === 1) {
                const mlkDay = new Date(date.getFullYear(), 0, 1);
                mlkDay.setDate(1 + (7 - mlkDay.getDay() + 1) % 7 + 14); // 3rd Monday
                isVariableHoliday = date.getDate() === mlkDay.getDate();
            }
            
            // Thanksgiving - 4th Thursday in November
            if (month === 11 && dayOfWeek === 4) {
                const thanksgiving = new Date(date.getFullYear(), 10, 1);
                thanksgiving.setDate(1 + (7 - thanksgiving.getDay() + 4) % 7 + 21); // 4th Thursday
                isVariableHoliday = date.getDate() === thanksgiving.getDate();
            }
            
            const isHoliday = isFixedHoliday || isVariableHoliday;
            const surcharge = isHoliday ? 100 : 0;
            
            console.log(`   📊 Month: ${month}, Day: ${day}, DayOfWeek: ${dayOfWeek}`);
            console.log(`   🎯 Fixed Holiday: ${isFixedHoliday}`);
            console.log(`   🎯 Variable Holiday: ${isVariableHoliday}`);
            console.log(`   💰 Holiday Surcharge: $${surcharge}`);
        });
        
    } else {
        console.log('❌ Export function not found!');
    }
    
} catch (error) {
    console.error('❌ Error reading HolidayPricingChecker:', error.message);
}

// Check the FacilityBookingForm integration
try {
    const formPath = path.join(__dirname, 'app/components/FacilityBookingForm.js');
    console.log('\n📄 Checking FacilityBookingForm integration...');
    
    const formContent = fs.readFileSync(formPath, 'utf8');
    
    // Check for HolidayPricingChecker import
    const importMatch = formContent.match(/import.*HolidayPricingChecker.*from/);
    if (importMatch) {
        console.log('✅ HolidayPricingChecker import found');
    } else {
        console.log('❌ HolidayPricingChecker import NOT found');
    }
    
    // Check for component usage
    const usageMatch = formContent.match(/<HolidayPricingChecker[^>]*>/);
    if (usageMatch) {
        console.log('✅ HolidayPricingChecker component usage found');
        console.log(`   📋 Usage: ${usageMatch[0]}`);
    } else {
        console.log('❌ HolidayPricingChecker component usage NOT found');
    }
    
    // Check for handleHolidayChange
    const handlerMatch = formContent.match(/handleHolidayChange.*=.*\([^}]+\}/s);
    if (handlerMatch) {
        console.log('✅ handleHolidayChange handler found');
    } else {
        console.log('❌ handleHolidayChange handler NOT found');
    }
    
} catch (error) {
    console.error('❌ Error reading FacilityBookingForm:', error.message);
}

console.log('\n🔧 DEBUGGING RECOMMENDATIONS:');
console.log('==============================');
console.log('1. Check browser console for JavaScript errors');
console.log('2. Verify date picker is passing correct date format');
console.log('3. Ensure handleHolidayChange is updating pricing state');
console.log('4. Test with different holiday dates in the actual form');
console.log('5. Check if authentication is interfering with component rendering');
