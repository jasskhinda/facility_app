'use client';

import { useState, useEffect } from 'react';

// Import the holiday checking function
import { checkHolidaySurcharge } from '../components/HolidayPricingChecker';

export default function TestHolidayPage() {
  const [testResults, setTestResults] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2025-12-25'); // Christmas
  const [customTestResult, setCustomTestResult] = useState(null);

  const predefinedTests = [
    { date: '2025-01-01', expected: "New Year's Day" },
    { date: '2025-07-04', expected: "Independence Day" },
    { date: '2025-12-25', expected: "Christmas Day" },
    { date: '2025-12-31', expected: "New Year's Eve" },
    { date: '2025-01-20', expected: "Martin Luther King Jr. Day" },
    { date: '2025-02-17', expected: "Presidents' Day" },
    { date: '2025-04-20', expected: "Easter Sunday" },
    { date: '2025-05-26', expected: "Memorial Day" },
    { date: '2025-09-01', expected: "Labor Day" },
    { date: '2025-11-27', expected: "Thanksgiving Day" },
    { date: '2025-11-28', expected: "Black Friday" },
    { date: '2025-06-15', expected: null }, // Should NOT be a holiday
    { date: '2025-08-15', expected: null }, // Should NOT be a holiday
  ];

  const runPredefinedTests = () => {
    const results = predefinedTests.map(test => {
      try {
        const result = checkHolidaySurcharge(test.date);
        const isCorrect = test.expected 
          ? (result.isHoliday && result.name === test.expected && result.surcharge === 100)
          : !result.isHoliday;
        
        return {
          date: test.date,
          expected: test.expected || 'No holiday',
          actual: result.isHoliday ? `${result.name} (+$${result.surcharge})` : 'No holiday',
          isCorrect,
          result
        };
      } catch (error) {
        return {
          date: test.date,
          expected: test.expected || 'No holiday',
          actual: `Error: ${error.message}`,
          isCorrect: false,
          result: null
        };
      }
    });
    
    setTestResults(results);
  };

  const testCustomDate = () => {
    try {
      const result = checkHolidaySurcharge(selectedDate);
      setCustomTestResult({
        date: selectedDate,
        result,
        formatted: result.isHoliday 
          ? `${result.name} - $${result.surcharge} surcharge`
          : 'No holiday detected'
      });
    } catch (error) {
      setCustomTestResult({
        date: selectedDate,
        result: null,
        formatted: `Error: ${error.message}`
      });
    }
  };

  useEffect(() => {
    runPredefinedTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🎄 Holiday Detection Test Page</h1>
        
        {/* Custom Date Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Custom Date Test</h2>
          <div className="flex items-center space-x-4 mb-4">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              onClick={testCustomDate}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Test Date
            </button>
          </div>
          
          {customTestResult && (
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="font-medium">{customTestResult.date}:</p>
              <p className={`text-lg ${customTestResult.result?.isHoliday ? 'text-green-600' : 'text-gray-600'}`}>
                {customTestResult.formatted}
              </p>
              {customTestResult.result?.isHoliday && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>Holiday Name: {customTestResult.result.name}</p>
                  <p>Surcharge: ${customTestResult.result.surcharge}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Predefined Tests Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Predefined Holiday Tests</h2>
            <button
              onClick={runPredefinedTests}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Re-run Tests
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testResults.map((test, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  test.isCorrect 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">{test.date}</span>
                  <span className={`text-sm font-bold ${test.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                    {test.isCorrect ? '✅' : '❌'}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p><strong>Expected:</strong> {test.expected}</p>
                  <p><strong>Actual:</strong> {test.actual}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Test Summary</h3>
            <p className="text-blue-700">
              Passed: {testResults.filter(t => t.isCorrect).length} / {testResults.length} tests
            </p>
            {testResults.filter(t => !t.isCorrect).length > 0 && (
              <p className="text-red-600 mt-1">
                Failed tests indicate holiday detection issues that need fixing.
              </p>
            )}
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">🔧 Integration Status</h3>
          <div className="space-y-2 text-yellow-700">
            <p>✅ HolidayPricingChecker component: Implemented</p>
            <p>✅ FacilityBookingForm integration: Complete</p>
            <p>✅ Export function: Available for testing</p>
            <p>✅ Holiday calculation algorithms: Implemented</p>
            <p>🔍 Testing: Use this page to verify functionality</p>
          </div>
        </div>
      </div>
    </div>
  );
}
