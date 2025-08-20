"use client";

import React, { useState, useEffect } from 'react';
import HolidayPricingChecker from '../components/HolidayPricingChecker';

export default function HolidayDiagnosticPage() {
  const [formData, setFormData] = useState({
    pickupTime: '',
  });
  const [holidayData, setHolidayData] = useState({
    isHoliday: false,
    holidayName: '',
    surcharge: 0
  });
  const [testResults, setTestResults] = useState([]);

  // Initialize with current time + 1 hour (exactly like booking form)
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    now.setSeconds(0);
    now.setMilliseconds(0);
    
    const formattedDate = now.toISOString().slice(0, 16); // Format: YYYY-MM-DDThh:mm
    setFormData(prev => ({ ...prev, pickupTime: formattedDate }));
  }, []);

  // Handle holiday pricing changes (exactly like booking form)
  const handleHolidayChange = (newHolidayData) => {
    console.log('🎯 Holiday change detected:', newHolidayData);
    setHolidayData(newHolidayData);
    
    // Add to test results
    const result = {
      timestamp: new Date().toLocaleTimeString(),
      pickupDate: formData.pickupTime,
      holidayData: newHolidayData,
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]);
  };

  // Test specific holiday dates
  const testHolidays = [
    { date: '2025-12-25T10:00', name: 'Christmas Day', expected: true },
    { date: '2025-01-01T10:00', name: 'New Year\'s Day', expected: true },
    { date: '2025-07-04T10:00', name: 'Independence Day', expected: true },
    { date: '2025-01-20T10:00', name: 'MLK Day (3rd Monday)', expected: true },
    { date: '2025-11-27T10:00', name: 'Thanksgiving', expected: true },
    { date: '2025-08-20T10:00', name: 'Regular Day', expected: false },
  ];

  const testSpecificDate = (testDate) => {
    console.log('🧪 Testing date:', testDate);
    setFormData(prev => ({ ...prev, pickupTime: testDate }));
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-red-600">🚨 Holiday Functionality Diagnostic</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-red-800">ISSUE: Holiday functionality not working</h2>
        <p className="text-sm text-red-700 mb-4">
          Testing the exact same integration as FacilityBookingForm to identify the problem.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Current Form State</h2>
          <div className="space-y-2 text-sm">
            <p><strong>pickupTime:</strong> {formData.pickupTime}</p>
            <p><strong>Parsed Date:</strong> {formData.pickupTime ? new Date(formData.pickupTime).toString() : 'None'}</p>
            <p><strong>Holiday Detected:</strong> {holidayData.isHoliday ? 'YES' : 'NO'}</p>
            {holidayData.isHoliday && (
              <>
                <p><strong>Holiday Name:</strong> {holidayData.holidayName}</p>
                <p><strong>Surcharge:</strong> ${holidayData.surcharge}</p>
              </>
            )}
          </div>
        </div>

        <div className="p-4 bg-green-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Quick Holiday Tests</h2>
          <div className="grid grid-cols-2 gap-2">
            {testHolidays.map((test, index) => (
              <button
                key={index}
                onClick={() => testSpecificDate(test.date)}
                className={`px-3 py-2 rounded text-xs font-medium ${
                  test.expected 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                {test.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Live HolidayPricingChecker Component</h2>
        <div className="border-2 border-gray-300 p-4 rounded bg-white">
          <HolidayPricingChecker
            pickupDate={formData.pickupTime}
            onHolidayChange={handleHolidayChange}
            className="mt-2"
          />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">Manual Date Input</h2>
        <input
          type="datetime-local"
          value={formData.pickupTime}
          onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value }))}
          className="border rounded px-3 py-2 w-full max-w-md"
        />
      </div>

      <div className="p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Test Results History</h2>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No tests run yet. Try the holiday test buttons above.</p>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-3 rounded border text-sm ${
                  result.holidayData.isHoliday 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {result.pickupDate} - {result.holidayData.isHoliday ? '🎄 HOLIDAY' : '📅 Regular'}
                    </p>
                    {result.holidayData.isHoliday && (
                      <p className="text-xs mt-1">
                        {result.holidayData.holidayName} - ${result.holidayData.surcharge} surcharge
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

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <div className="text-xs space-y-1 font-mono">
          <p>• Component mounted: {formData.pickupTime ? 'YES' : 'NO'}</p>
          <p>• Date format: {formData.pickupTime ? 'ISO (YYYY-MM-DDTHH:MM)' : 'None'}</p>
          <p>• Holiday callback: {testResults.length > 0 ? 'Working' : 'Not called yet'}</p>
          <p>• Console: Check browser dev tools for detailed logs</p>
        </div>
      </div>
    </div>
  );
}
