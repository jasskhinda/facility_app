"use client";

import React, { useState, useEffect } from 'react';
import HolidayPricingChecker from '../components/HolidayPricingChecker';

export default function EmergencyHolidayTest() {
  const [testResult, setTestResult] = useState('Not tested yet');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Set current date in the format the booking form uses
    const now = new Date();
    const formatted = now.toISOString().slice(0, 16);
    setCurrentDate(formatted);
  }, []);

  const testHolidayFunction = () => {
    try {
      // Test with Christmas 2025
      const christmasDate = '2025-12-25T10:00';
      
      // Import and test the function directly
      import('../components/HolidayPricingChecker').then(module => {
        const { checkHolidaySurcharge } = module;
        const result = checkHolidaySurcharge(christmasDate);
        
        console.log('🎄 Christmas test result:', result);
        setTestResult(JSON.stringify(result, null, 2));
      }).catch(error => {
        console.error('Error importing:', error);
        setTestResult('ERROR: ' + error.message);
      });
    } catch (error) {
      console.error('Test error:', error);
      setTestResult('ERROR: ' + error.message);
    }
  };

  const handleHolidayChange = (holidayData) => {
    console.log('🎯 Holiday change callback:', holidayData);
    setTestResult('Callback received: ' + JSON.stringify(holidayData, null, 2));
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-red-600 mb-4">🚨 EMERGENCY HOLIDAY TEST</h1>
      
      <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
        <h2 className="font-bold text-red-800">ISSUE: Holiday functionality not working on production</h2>
        <p className="text-red-700">URL: https://facility.compassionatecaretransportation.com/dashboard/book</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-bold">Current Local Date:</h3>
          <p className="font-mono">{currentDate}</p>
        </div>

        <div>
          <button 
            onClick={testHolidayFunction}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            🧪 TEST CHRISTMAS 2025 DIRECTLY
          </button>
        </div>

        <div>
          <h3 className="font-bold">Test Result:</h3>
          <pre className="bg-gray-100 p-2 rounded text-sm">{testResult}</pre>
        </div>

        <div className="border-2 border-red-300 p-4 rounded">
          <h3 className="font-bold mb-2">Live Component Test - Christmas 2025:</h3>
          <HolidayPricingChecker
            pickupDate="2025-12-25T10:00"
            onHolidayChange={handleHolidayChange}
          />
        </div>

        <div className="border-2 border-blue-300 p-4 rounded">
          <h3 className="font-bold mb-2">Live Component Test - Today:</h3>
          <HolidayPricingChecker
            pickupDate={currentDate}
            onHolidayChange={handleHolidayChange}
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded">
        <h3 className="font-bold">If this works locally but not in production:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>The changes aren't deployed to production</li>
          <li>There's a build/deployment issue</li>
          <li>Production is using cached version</li>
          <li>Environment variables or configuration differences</li>
        </ul>
      </div>
    </div>
  );
}
