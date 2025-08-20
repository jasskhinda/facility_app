"use client";

import React, { useState } from 'react';
import HolidayPricingChecker from '../components/HolidayPricingChecker';

export default function HolidayDateFormatTest() {
  const [testDate, setTestDate] = useState('');
  const [holidayResult, setHolidayResult] = useState(null);
  const [dateFormat, setDateFormat] = useState('');

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setTestDate(selectedDate);
    
    // Show the exact format being passed
    setDateFormat(selectedDate);
    
    // Create a datetime string like the booking form would
    const dateTimeString = selectedDate + 'T10:00:00';
    setDateFormat(dateTimeString);
  };

  const handleHolidayChange = (holidayData) => {
    setHolidayResult(holidayData);
    console.log('Holiday Data Received:', holidayData);
  };

  // Test dates for 2025
  const testDates = [
    { date: '2025-01-01', name: 'New Year\'s Day' },
    { date: '2025-01-20', name: 'MLK Day (3rd Monday)' },
    { date: '2025-02-17', name: 'Presidents Day (3rd Monday)' },
    { date: '2025-07-04', name: 'Independence Day' },
    { date: '2025-11-27', name: 'Thanksgiving (4th Thursday)' },
    { date: '2025-12-25', name: 'Christmas Day' },
    { date: '2025-08-20', name: 'Regular Day (Today)' }
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Holiday Date Format Test</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Manual Date Input</h2>
        <input
          type="date"
          value={testDate}
          onChange={handleDateChange}
          className="border rounded px-3 py-2 mr-4"
        />
        <div className="mt-2 text-sm text-gray-600">
          <p><strong>Date Format Being Passed:</strong> {dateFormat}</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Quick Test Buttons</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {testDates.map(({ date, name }) => (
            <button
              key={date}
              onClick={() => {
                setTestDate(date);
                setDateFormat(date + 'T10:00:00');
              }}
              className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {dateFormat && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Holiday Checker Component</h2>
          <HolidayPricingChecker
            pickupDate={dateFormat}
            onHolidayChange={handleHolidayChange}
            className="border p-4 rounded"
          />
        </div>
      )}

      {holidayResult && (
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Holiday Detection Result</h2>
          <div className="space-y-2">
            <p><strong>Is Holiday:</strong> {holidayResult.isHoliday ? 'YES' : 'NO'}</p>
            <p><strong>Holiday Name:</strong> {holidayResult.holidayName || 'N/A'}</p>
            <p><strong>Surcharge:</strong> ${holidayResult.surcharge || 0}</p>
            <p><strong>Federal Holiday:</strong> {holidayResult.isFederal ? 'YES' : 'NO'}</p>
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-red-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <p className="text-sm">
          This test checks if the HolidayPricingChecker component is working correctly
          with different date formats. Try the quick test buttons to test known holidays.
        </p>
        <p className="text-sm mt-2">
          <strong>Current Test Date:</strong> {testDate}<br/>
          <strong>DateTime Format:</strong> {dateFormat}
        </p>
      </div>
    </div>
  );
}
