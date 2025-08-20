"use client";

import React, { useState } from 'react';
import { checkHolidaySurcharge } from '../components/HolidayPricingChecker';

export default function DirectHolidayTest() {
  const [testDate, setTestDate] = useState('2025-12-25T10:00');
  const [result, setResult] = useState(null);

  const testDirectFunction = () => {
    console.log('🧪 Testing direct function with:', testDate);
    try {
      const result = checkHolidaySurcharge(testDate);
      console.log('🎯 Direct function result:', result);
      setResult(result);
    } catch (error) {
      console.error('❌ Error in direct function:', error);
      setResult({ error: error.message });
    }
  };

  const knownHolidays = [
    '2025-12-25T10:00', // Christmas
    '2025-01-01T10:00', // New Year
    '2025-07-04T10:00', // July 4th
    '2025-01-20T10:00', // MLK Day
    '2025-11-27T10:00', // Thanksgiving
    '2025-08-20T10:00', // Regular day
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Direct Holiday Function Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Test Date:</label>
        <select 
          value={testDate} 
          onChange={(e) => setTestDate(e.target.value)}
          className="border p-2 rounded mr-4"
        >
          {knownHolidays.map(date => (
            <option key={date} value={date}>
              {date} - {new Date(date).toDateString()}
            </option>
          ))}
        </select>
        <button 
          onClick={testDirectFunction}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Direct Function
        </button>
      </div>

      {result && (
        <div className="p-4 border rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">About This Test:</h2>
        <p className="text-sm">
          This test calls the checkHolidaySurcharge function directly, bypassing the React component.
          This helps isolate whether the issue is in the holiday calculation logic or the component integration.
        </p>
      </div>
    </div>
  );
}
