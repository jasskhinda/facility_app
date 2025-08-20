'use client';

import { useState, useEffect } from 'react';
import HolidayPricingChecker from '../components/HolidayPricingChecker';

export default function HolidayDebugPage() {
  const [testDate, setTestDate] = useState('2025-12-25T10:00'); // Christmas with time
  const [holidayResult, setHolidayResult] = useState(null);
  const [componentVisible, setComponentVisible] = useState(false);

  const handleHolidayChange = (holidayData) => {
    console.log('Holiday change callback triggered:', holidayData);
    setHolidayResult(holidayData);
    setComponentVisible(holidayData.isHoliday);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🔍 Holiday Component Debug</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Holiday Component</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Date (same format as booking form)
            </label>
            <input
              type="datetime-local"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Holiday Component Output:</h3>
            <div className="border border-gray-200 rounded-md p-4 min-h-[100px]">
              <HolidayPricingChecker
                pickupDate={testDate}
                onHolidayChange={handleHolidayChange}
                className="w-full"
              />
              {!componentVisible && (
                <p className="text-gray-500 italic">No holiday detected for this date</p>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="font-medium mb-2">Debug Information:</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Input Date:</strong> {testDate}</p>
              <p><strong>Component Visible:</strong> {componentVisible ? 'Yes' : 'No'}</p>
              <p><strong>Holiday Result:</strong></p>
              <pre className="bg-white p-2 rounded border text-xs overflow-auto">
                {holidayResult ? JSON.stringify(holidayResult, null, 2) : 'No result yet'}
              </pre>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Test Instructions:</h3>
          <div className="space-y-2 text-blue-700">
            <p>1. Try different dates to see if holiday detection works</p>
            <p>2. Test with Christmas (2025-12-25), New Year (2025-01-01), etc.</p>
            <p>3. Check if the component appears when a holiday is selected</p>
            <p>4. Verify the callback function receives correct data</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">Expected Behavior:</h3>
          <div className="space-y-2 text-yellow-700">
            <p>✅ For holiday dates: Component should be visible with amber alert</p>
            <p>✅ Holiday name and $100 surcharge should be displayed</p>
            <p>✅ Callback should receive: {`{ isHoliday: true, holidayName: "Holiday Name", surcharge: 100 }`}</p>
            <p>✅ For non-holidays: Component should be hidden, callback gets false</p>
          </div>
        </div>
      </div>
    </div>
  );
}
