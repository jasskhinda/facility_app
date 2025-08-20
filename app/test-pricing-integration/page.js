"use client";

import React, { useState, useEffect } from 'react';

// Simulate the pricing calculation from FacilityBookingForm
const calculatePricingWithEnhancements = (miles, wheelchairInfo, clientInfo, holiday) => {
  console.log('🧮 calculatePricingWithEnhancements called with:', {
    miles, wheelchairInfo, clientInfo, holiday
  });

  // Use bariatric rate if client weighs 300+ lbs, otherwise regular rate
  let basePrice = clientInfo.isBariatric ? 150 : 50; // $150 for bariatric, $50 regular

  // Mileage calculation ($3 per mile)
  basePrice += miles * 3;
  
  // Weekend adjustment
  const pickupDate = new Date(holiday.testDate || '2025-08-20T10:00');
  const day = pickupDate.getDay();
  if (day === 0 || day === 6) { // Weekend
    basePrice += 40;
  }
  
  // Extra hour adjustment (before 8am or after 8pm)
  const hour = pickupDate.getHours();
  if (hour <= 8 || hour >= 20) {
    basePrice += 40;
  }
  
  // Wheelchair accessibility fee (facility app = $0)
  if (wheelchairInfo.hasWheelchairFee) {
    basePrice += wheelchairInfo.fee; // Should be 0 for facility app
  }
  
  // Holiday surcharge (applied to total bill)
  console.log('🎯 Holiday check:', holiday);
  if (holiday.isHoliday) {
    console.log(`💰 Adding holiday surcharge: $${holiday.surcharge}`);
    basePrice += holiday.surcharge; // +$100 for holidays
  } else {
    console.log('📅 No holiday surcharge');
  }
  
  const finalPrice = Math.round(basePrice);
  console.log(`💵 Final price: $${finalPrice}`);
  return finalPrice;
};

export default function PricingIntegrationTest() {
  const [testResults, setTestResults] = useState([]);

  const testPricingIntegration = (testDate, holidayName) => {
    console.log(`\n🧪 Testing pricing integration for ${holidayName} (${testDate})`);
    
    // Simulate the holiday data that would come from HolidayPricingChecker
    const holidayData = {
      isHoliday: true,
      holidayName: holidayName,
      surcharge: 100,
      isFederal: true,
      testDate: testDate
    };

    // Simulate other form data
    const miles = 10;
    const wheelchairInfo = { hasWheelchairFee: false, fee: 0 };
    const clientInfo = { isBariatric: false };

    // Calculate pricing
    const price = calculatePricingWithEnhancements(miles, wheelchairInfo, clientInfo, holidayData);
    
    // Expected: $50 base + $30 (10 miles × $3) + $100 holiday = $180
    const expected = 180;
    const passed = price === expected;

    const result = {
      testDate,
      holidayName,
      price,
      expected,
      passed,
      timestamp: new Date().toLocaleTimeString()
    };

    setTestResults(prev => [result, ...prev.slice(0, 9)]);
    return result;
  };

  const testRegularDay = () => {
    console.log(`\n🧪 Testing pricing for regular day`);
    
    const holidayData = {
      isHoliday: false,
      holidayName: '',
      surcharge: 0,
      testDate: '2025-08-20T10:00'
    };

    const miles = 10;
    const wheelchairInfo = { hasWheelchairFee: false, fee: 0 };
    const clientInfo = { isBariatric: false };

    const price = calculatePricingWithEnhancements(miles, wheelchairInfo, clientInfo, holidayData);
    
    // Expected: $50 base + $30 (10 miles × $3) = $80
    const expected = 80;
    const passed = price === expected;

    const result = {
      testDate: '2025-08-20T10:00',
      holidayName: 'Regular Day',
      price,
      expected,
      passed,
      timestamp: new Date().toLocaleTimeString()
    };

    setTestResults(prev => [result, ...prev.slice(0, 9)]);
    return result;
  };

  const holidayTests = [
    { date: '2025-12-25T10:00', name: 'Christmas Day' },
    { date: '2025-01-01T10:00', name: 'New Year\'s Day' },
    { date: '2025-07-04T10:00', name: 'Independence Day' },
    { date: '2025-01-20T10:00', name: 'MLK Day' }
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Pricing Integration Test</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Holiday Pricing Integration</h2>
        <p className="text-sm text-gray-600 mb-4">
          This tests if the holiday surcharge is correctly applied in the pricing calculation.
          Base price: $50, Distance: 10 miles ($30), Holiday surcharge: $100
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {holidayTests.map((test) => (
            <button
              key={test.date}
              onClick={() => testPricingIntegration(test.date, test.name)}
              className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600"
            >
              {test.name}
            </button>
          ))}
          <button
            onClick={testRegularDay}
            className="bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
          >
            Regular Day
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Results</h2>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No tests run yet. Click a test button above.</p>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded border ${result.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {result.holidayName} - {result.passed ? '✅ PASS' : '❌ FAIL'}
                    </p>
                    <p className="text-sm">
                      Price: ${result.price} | Expected: ${result.expected}
                    </p>
                    <p className="text-xs text-gray-500">{result.testDate}</p>
                  </div>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <div className="text-sm space-y-2">
          <p><strong>Purpose:</strong> Test if holiday surcharge is applied correctly in pricing</p>
          <p><strong>Logic:</strong> Base ($50) + Miles (10 × $3 = $30) + Holiday ($100) = $180</p>
          <p><strong>Regular Day:</strong> Base ($50) + Miles (10 × $3 = $30) = $80</p>
          <p><strong>Check Console:</strong> Open browser dev tools to see detailed calculation logs</p>
        </div>
      </div>
    </div>
  );
}
