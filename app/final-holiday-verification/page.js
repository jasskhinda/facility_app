"use client";

import React, { useState, useEffect } from 'react';

export default function FinalHolidayVerification() {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test the holiday detection function directly
    const testHolidayDetection = async () => {
      setLoading(true);
      
      try {
        // Import the function dynamically
        const { checkHolidaySurcharge } = await import('../components/HolidayPricingChecker');
        
        const testCases = [
          { date: '2025-12-25T10:00', name: 'Christmas Day', expected: true, expectedSurcharge: 100 },
          { date: '2025-01-01T10:00', name: 'New Year\'s Day', expected: true, expectedSurcharge: 100 },
          { date: '2025-07-04T10:00', name: 'Independence Day', expected: true, expectedSurcharge: 100 },
          { date: '2025-01-20T10:00', name: 'MLK Day', expected: true, expectedSurcharge: 100 },
          { date: '2025-11-27T10:00', name: 'Thanksgiving', expected: true, expectedSurcharge: 100 },
          { date: '2025-08-20T10:00', name: 'Regular Day', expected: false, expectedSurcharge: 0 },
        ];

        const results = {};
        
        for (const testCase of testCases) {
          try {
            const result = checkHolidaySurcharge(testCase.date);
            const passed = result.isHoliday === testCase.expected && result.surcharge === testCase.expectedSurcharge;
            
            results[testCase.date] = {
              ...testCase,
              result,
              passed,
              error: null
            };
          } catch (error) {
            results[testCase.date] = {
              ...testCase,
              result: null,
              passed: false,
              error: error.message
            };
          }
        }
        
        setTestResults(results);
      } catch (error) {
        console.error('Failed to test holiday detection:', error);
      } finally {
        setLoading(false);
      }
    };

    testHolidayDetection();
  }, []);

  const allTestsPassed = Object.values(testResults).every(test => test.passed);
  const passedCount = Object.values(testResults).filter(test => test.passed).length;
  const totalCount = Object.keys(testResults).length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Final Holiday Functionality Verification</h1>
      
      <div className={`mb-6 p-4 rounded-lg border ${allTestsPassed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h2 className="text-lg font-semibold mb-2">
          {loading ? '⏳ Testing...' : allTestsPassed ? '✅ All Tests Passed' : '❌ Some Tests Failed'}
        </h2>
        <p className="text-sm">
          {loading ? 'Running comprehensive holiday detection tests...' : 
           `${passedCount}/${totalCount} tests passed. ${allTestsPassed ? 'Holiday functionality is working correctly!' : 'Issues found in holiday detection.'}`}
        </p>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(testResults).map(([date, test]) => (
            <div 
              key={date}
              className={`p-4 rounded-lg border ${test.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              <h3 className="font-semibold mb-2 flex items-center">
                {test.passed ? '✅' : '❌'} {test.name}
              </h3>
              <div className="text-sm space-y-1">
                <p><strong>Date:</strong> {date}</p>
                <p><strong>Expected Holiday:</strong> {test.expected ? 'Yes' : 'No'}</p>
                <p><strong>Expected Surcharge:</strong> ${test.expectedSurcharge}</p>
                
                {test.error ? (
                  <p className="text-red-600"><strong>Error:</strong> {test.error}</p>
                ) : test.result ? (
                  <>
                    <p><strong>Actual Holiday:</strong> {test.result.isHoliday ? 'Yes' : 'No'}</p>
                    <p><strong>Actual Surcharge:</strong> ${test.result.surcharge || 0}</p>
                    {test.result.name && <p><strong>Holiday Name:</strong> {test.result.name}</p>}
                  </>
                ) : (
                  <p className="text-gray-500">No result</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">🔧 Troubleshooting Steps</h2>
        
        <div className="space-y-3 text-sm">
          <div>
            <h3 className="font-medium">If holiday detection is working but not showing in booking form:</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Check browser console for JavaScript errors</li>
              <li>Verify pickup date format is YYYY-MM-DDTHH:MM</li>
              <li>Ensure addresses are entered to trigger pricing calculation</li>
              <li>Check if handleHolidayChange callback is being called</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium">If holiday detection is failing:</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Verify HolidayPricingChecker component is imported correctly</li>
              <li>Check if pickupDate prop is being passed correctly</li>
              <li>Ensure onHolidayChange callback is provided</li>
              <li>Verify holiday calculation algorithms are working</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium">Common issues:</h3>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Browser cache - try hard refresh (Ctrl+F5 / Cmd+Shift+R)</li>
              <li>Date timezone issues - ensure dates are being parsed correctly</li>
              <li>Component not re-rendering when date changes</li>
              <li>Pricing calculation not including holiday surcharge</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">📋 Implementation Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium mb-2">✅ Completed:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>HolidayPricingChecker component created</li>
              <li>All US holidays detection implemented</li>
              <li>Integration with FacilityBookingForm</li>
              <li>Pricing calculation with holiday surcharge</li>
              <li>Export function for direct testing</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">🔍 Testing:</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Direct function testing: /direct-holiday-test</li>
              <li>Component testing: /holiday-diagnostic</li>
              <li>Booking flow testing: /booking-flow-test</li>
              <li>Live testing: /test-live-holiday</li>
              <li>Comprehensive verification: This page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
