'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const SuperSimpleMap = dynamic(() => import('../components/SuperSimpleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">Loading map...</p>
      </div>
    </div>
  )
});

const PricingDisplay = dynamic(() => import('../components/PricingDisplay'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-32 rounded"></div>
});

export default function WheelchairPricingTest() {
  const [formData, setFormData] = useState({
    pickupAddress: '5050 Blazer Pkwy #100, Dublin, OH 43017, USA',
    destinationAddress: '1234 E Broad St, Columbus, OH 43205, USA',
    pickupDate: '2025-06-20',
    pickupTime: '10:00',
    isRoundTrip: false,
    wheelchairType: 'no_wheelchair'
  });

  const [routeInfo, setRouteInfo] = useState(null);
  const [showPricing, setShowPricing] = useState(false);

  const mockClient = { client_type: 'facility' };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">♿ Wheelchair Pricing Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Trip Settings</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Wheelchair Type</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="wheelchair"
                  value="no_wheelchair"
                  checked={formData.wheelchairType === 'no_wheelchair'}
                  onChange={(e) => setFormData({...formData, wheelchairType: e.target.value})}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">No wheelchair</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="wheelchair"
                  value="foldable"
                  checked={formData.wheelchairType === 'foldable'}
                  onChange={(e) => setFormData({...formData, wheelchairType: e.target.value})}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-semibold text-gray-700">
                  Foldable wheelchair +$25
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="wheelchair"
                  value="power"
                  checked={formData.wheelchairType === 'power'}
                  onChange={(e) => setFormData({...formData, wheelchairType: e.target.value})}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-semibold text-gray-700">
                  Power wheelchair +$25
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={() => setShowPricing(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Calculate Pricing
          </button>
        </div>

        {showPricing && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Route Overview</h3>
            <SuperSimpleMap
              origin={formData.pickupAddress}
              destination={formData.destinationAddress}
              onRouteCalculated={setRouteInfo}
            />
          </div>
        )}

        {showPricing && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Pricing Breakdown</h3>
            <PricingDisplay
              formData={formData}
              selectedClient={mockClient}
              routeInfo={routeInfo}
              isVisible={showPricing}
            />
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">✅ What This Tests</h3>
          <div className="space-y-2 text-green-700 text-sm">
            <p><strong>1.</strong> Wheelchair options now show "+$25" in the labels</p>
            <p><strong>2.</strong> Both foldable and power wheelchairs add exactly $25</p>
            <p><strong>3.</strong> Pricing breakdown shows "Wheelchair Accessibility +$25"</p>
            <p><strong>4.</strong> Total price correctly includes wheelchair surcharge</p>
          </div>
        </div>
      </div>
    </div>
  );
}
