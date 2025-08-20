'use client';

import { useState, useEffect } from 'react';
import { checkHolidaySurcharge } from '../components/HolidayPricingChecker';

export default function TestHolidayDetection() {
  const [testDate, setTestDate] = useState('2025-12-25');
  const [result, setResult] = useState(null);

  useEffect(() => {
    const holidayCheck = checkHolidaySurcharge(testDate);
    setResult(holidayCheck);
  }, [testDate]);

  const testDates = [
    { date: '2025-01-01', name: "New Year's Day" },
    { date: '2025-12-31', name: "New Year's Eve" },
    { date: '2025-07-04', name: "Independence Day" },
    { date: '2025-12-24', name: "Christmas Eve" },
    { date: '2025-12-25', name: "Christmas Day" },
    { date: '2025-04-20', name: "Easter Sunday" },
    { date: '2025-05-26', name: "Memorial Day" },
    { date: '2025-09-01', name: "Labor Day" },
    { date: '2025-11-27', name: "Thanksgiving" },
    { date: '2025-08-15', name: "Regular Day (No Holiday)" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Holiday Detection Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Test Date:</label>
          <input
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
          
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Result:</h3>
            {result && (
              <div>
                <p>Is Holiday: <span className={result.isHoliday ? "text-green-600 font-bold" : "text-red-600"}>{result.isHoliday ? 'YES' : 'NO'}</span></p>
                {result.isHoliday && (
                  <>
                    <p>Holiday Name: <strong>{result.name}</strong></p>
                    <p>Surcharge: <strong>${result.surcharge}</strong></p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Test All Holidays:</h2>
          <div className="space-y-2">
            {testDates.map((test) => {
              const check = checkHolidaySurcharge(test.date);
              return (
                <div key={test.date} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <span className="font-medium">{test.name}</span>
                    <span className="text-gray-500 ml-2">({test.date})</span>
                  </div>
                  <div>
                    {check.isHoliday ? (
                      <span className="text-green-600 font-bold">✓ Holiday (+${check.surcharge})</span>
                    ) : (
                      <span className="text-gray-400">No surcharge</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}