'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const SuperSimpleMap = dynamic(() => import('../components/SuperSimpleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">Loading map...</p>
      </div>
    </div>
  )
});

export default function BookingFormMapTest() {
  const [formData, setFormData] = useState({
    pickupAddress: '',
    destinationAddress: ''
  });
  const [routeInfo, setRouteInfo] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setRouteInfo(null);
    setShowMap(false);
  };

  const handleShowRoute = () => {
    if (formData.pickupAddress && formData.destinationAddress) {
      setShowMap(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🚗 Booking Form Map Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Enter Addresses</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address *</label>
              <input
                type="text"
                value={formData.pickupAddress}
                onChange={(e) => handleAddressChange('pickupAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter pickup address"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination Address *</label>
              <input
                type="text"
                value={formData.destinationAddress}
                onChange={(e) => handleAddressChange('destinationAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter destination address"
              />
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleShowRoute}
              disabled={!formData.pickupAddress || !formData.destinationAddress}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Show Route Overview
            </button>
            
            <button
              onClick={() => {
                setFormData({
                  pickupAddress: '5050 Blazer Pkwy #100, Dublin, OH 43017, USA',
                  destinationAddress: '1234 E Broad St, Columbus, OH 43205, USA'
                });
                setShowMap(false);
                setRouteInfo(null);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Load Test Addresses
            </button>
          </div>
        </div>

        {formData.pickupAddress && formData.destinationAddress && showMap && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Route Overview</label>
            <SuperSimpleMap
              origin={formData.pickupAddress}
              destination={formData.destinationAddress}
              onRouteCalculated={setRouteInfo}
            />
          </div>
        )}

        {routeInfo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Route Calculated Successfully!</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{routeInfo.distance.text}</div>
                <div className="text-sm text-green-600">Distance ({routeInfo.distance.miles} miles)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{routeInfo.duration.text}</div>
                <div className="text-sm text-green-600">Estimated time</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 Test Status</h3>
          <div className="text-blue-700 text-sm">
            <p>✅ This test uses the exact same implementation as the production booking form</p>
            <p>✅ Expected: Map loads without "Map container failed to initialize" errors</p>
          </div>
        </div>
      </div>
    </div>
  );
}
