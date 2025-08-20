"use client";

import React, { useState } from 'react';
import { getPricingEstimate } from '../../lib/pricing';

export default function HolidayIntegrationTest() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testHolidayPricing = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🎄 Testing holiday pricing integration...');
      
      // Test data for Christmas Day
      const testData = {
        pickupAddress: '123 Main St, Columbus, OH',
        destinationAddress: '456 Oak Ave, Columbus, OH',
        isRoundTrip: false,
        pickupDateTime: new Date('2025-12-25T10:00:00').toISOString(),
        wheelchairType: 'no_wheelchair',
        clientType: 'facility',
        additionalPassengers: 0,
        isEmergency: false,
        preCalculatedDistance: { miles: 5.2, text: '5.2 miles', duration: { text: '12 mins' } },
        clientWeight: null,
        holidayData: {
          isHoliday: true,
          holidayName: 'Christmas Day',
          surcharge: 100
        },
        calculateDeadMileageEnabled: false
      };

      console.log('📊 Calling getPricingEstimate with:', testData);
      
      const pricing = await getPricingEstimate(testData);
      
      console.log('💰 Pricing result:', pricing);
      setResult(pricing);

    } catch (error) {
      console.error('❌ Error testing pricing:', error);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Holiday Pricing Integration Test</h1>
      
      <div className="mb-6">
        <button 
          onClick={testHolidayPricing}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Holiday Pricing'}
        </button>
      </div>

      {result && (
        <div className="p-4 border rounded">
          <h2 className="text-lg font-semibold mb-4">Test Results</h2>
          
          {result.success ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded">
                <p className="text-green-800 font-semibold">✅ Pricing calculation successful!</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <h3 className="font-semibold mb-2">Pricing Breakdown</h3>
                  <ul className="space-y-1 text-sm">
                    <li>Base Price: ${result.pricing?.basePrice?.toFixed(2) || '0.00'}</li>
                    <li>Distance Price: ${result.pricing?.distancePrice?.toFixed(2) || '0.00'}</li>
                    <li>Holiday Surcharge: ${result.pricing?.holidaySurcharge?.toFixed(2) || '0.00'}</li>
                    <li className="font-bold border-t pt-1">Total: ${result.pricing?.total?.toFixed(2) || '0.00'}</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <h3 className="font-semibold mb-2">Holiday Detection</h3>
                  <ul className="space-y-1 text-sm">
                    <li>Has Holiday Surcharge: {result.pricing?.hasHolidaySurcharge ? '✅ Yes' : '❌ No'}</li>
                    <li>Surcharge Amount: ${result.pricing?.holidaySurcharge || 0}</li>
                  </ul>
                </div>
              </div>
              
              <details className="p-3 bg-gray-50 rounded">
                <summary className="font-semibold cursor-pointer">Full Response Data</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="p-3 bg-red-50 rounded">
              <p className="text-red-800 font-semibold">❌ Test failed</p>
              <p className="text-red-600 mt-1">{result.error}</p>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="font-bold text-blue-800 mb-2">Expected Result:</h3>
        <p className="text-blue-700">
          The test should show a $100 holiday surcharge for Christmas Day, 
          and `hasHolidaySurcharge` should be `true`.
        </p>
      </div>
    </div>
  );
}
