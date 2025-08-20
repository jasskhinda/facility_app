"use client";

import React, { useState } from 'react';
import HolidayPricingChecker from '../components/HolidayPricingChecker';

export default function HolidayDebugPage() {
  const [testResults, setTestResults] = useState([]);
  const [currentTest, setCurrentTest] = useState('');

  const testDates = [
    { date: '2025-12-25T10:00', name: 'Christmas Day' },
    { date: '2025-01-01T10:00', name: 'New Year\'s Day' },
    { date: '2025-07-04T10:00', name: 'Independence Day' },
    { date: '2025-01-20T10:00', name: 'MLK Day (3rd Monday Jan)' },
    { date: '2025-11-27T10:00', name: 'Thanksgiving (4th Thursday Nov)' },
    { date: '2025-08-20T10:00', name: 'Regular Day (Today)' },
    { date: '2025-12-24T10:00', name: 'Christmas Eve' },
    { date: '2025-12-31T10:00', name: 'New Year\'s Eve' }
  ];

  const runTest = (testDate, expectedName) => {
    setCurrentTest(testDate.date);
    console.log(`🧪 Testing ${testDate.name} (${testDate.date})`);
  };

  const handleHolidayResult = (holidayData) => {
    const result = {
      date: currentTest,
      isHoliday: holidayData.isHoliday,
      name: holidayData.holidayName,
      surcharge: holidayData.surcharge,
      isFederal: holidayData.isFederal,
      timestamp: new Date().toLocaleTimeString()
    };
    
    console.log('🎯 Holiday Result:', result);
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Holiday Detection Debug</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Holiday Detection</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {testDates.map((testDate) => (
            <button
              key={testDate.date}
              onClick={() => runTest(testDate, testDate.name)}
              className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
            >
              {testDate.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Click a button to test holiday detection. Results will appear below.
        </p>
      </div>

      {currentTest && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Current Test: {currentTest}</h2>
          <HolidayPricingChecker
            pickupDate={currentTest}
            onHolidayChange={handleHolidayResult}
            className="border p-4 rounded bg-white"
          />
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Results History</h2>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No tests run yet. Click a test button above.</p>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded border ${result.isHoliday ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {result.date} - {result.isHoliday ? '🎉 HOLIDAY' : '📅 Regular Day'}
                    </p>
                    {result.isHoliday && (
                      <p className="text-sm">
                        <strong>{result.name}</strong> - ${result.surcharge} surcharge
                        {result.isFederal ? ' (Federal)' : ' (Non-Federal)'}
                      </p>
                    )}
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
          <p><strong>Purpose:</strong> Test if HolidayPricingChecker correctly detects holidays</p>
          <p><strong>Date Format:</strong> YYYY-MM-DDTHH:MM (ISO format without seconds)</p>
          <p><strong>Expected Behavior:</strong> $100 surcharge for all holidays</p>
          <p><strong>Check Console:</strong> Open browser dev tools to see detailed logs</p>
        </div>
      </div>
    </div>
  );
}
