"use client";

import React, { useState } from 'react';
import HolidayPricingChecker from '../components/HolidayPricingChecker';

export default function HolidayTestPage() {
  const [testDate, setTestDate] = useState('2025-12-25T10:00');
  const [result, setResult] = useState(null);

  const handleHolidayChange = (holidayData) => {
    console.log('Holiday detected:', holidayData);
    setResult(holidayData);
  };

  const testDates = [
    '2025-12-25T10:00', // Christmas
    '2025-01-01T10:00', // New Year
    '2025-07-04T10:00', // July 4th
    '2025-08-20T10:00', // Regular day
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Holiday Detection Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Test Date:</label>
        <select 
          value={testDate} 
          onChange={(e) => setTestDate(e.target.value)}
          className="border p-2 rounded"
        >
          {testDates.map(date => (
            <option key={date} value={date}>
              {new Date(date).toLocaleDateString()} - {date.includes('12-25') ? 'Christmas' : date.includes('01-01') ? 'New Year' : date.includes('07-04') ? 'July 4th' : 'Regular Day'}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4 p-4 border rounded">
        <h2 className="font-bold mb-2">HolidayPricingChecker Component:</h2>
        <HolidayPricingChecker
          pickupDate={testDate}
          onHolidayChange={handleHolidayChange}
        />
      </div>

      {result && (
        <div className="p-4 bg-green-100 rounded">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
