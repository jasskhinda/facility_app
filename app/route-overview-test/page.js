'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the SuperSimpleMap component
const SuperSimpleMap = dynamic(() => import('../components/SuperSimpleMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-gray-600 text-sm">Loading map...</p>
    </div>
  </div>
});

const SimpleAutocomplete = dynamic(() => import('../components/SimpleAutocomplete'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
});

export default function RouteOverviewTestPage() {
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);

  const handleRouteCalculated = (info) => {
    console.log('Route calculated:', info);
    setRouteInfo(info);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            🗺️ Route Overview Demo
          </h1>
          <p className="text-gray-600">
            Test the exact Route Overview functionality used in the booking form
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Enter Trip Details
          </h2>

          {/* Address Inputs */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Address *
              </label>
              <SimpleAutocomplete
                value={pickupAddress}
                onChange={setPickupAddress}
                placeholder="Enter pickup address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination Address *
              </label>
              <SimpleAutocomplete
                value={destinationAddress}
                onChange={setDestinationAddress}
                placeholder="Enter destination address"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Route Overview Section - This is the exact component used in the booking form */}
          {pickupAddress && destinationAddress && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Route Overview
              </label>
              <SuperSimpleMap
                origin={pickupAddress}
                destination={destinationAddress}
                onRouteCalculated={handleRouteCalculated}
              />
            </div>
          )}

          {/* Route Summary */}
          {routeInfo && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Trip Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-green-600">Distance:</span>
                  <p className="font-bold text-green-900">{routeInfo.distance.text}</p>
                </div>
                <div>
                  <span className="text-sm text-green-600">Duration:</span>
                  <p className="font-bold text-green-900">{routeInfo.duration.text}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">✅ Test Instructions</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enter a pickup address (e.g., "123 Main St, Columbus, OH")</li>
              <li>• Enter a destination address (e.g., "456 High St, Columbus, OH")</li>
              <li>• Watch the Route Overview section load (should NOT get stuck on "Initializing map...")</li>
              <li>• Verify the map shows a blue route line between the two locations</li>
              <li>• Check that distance and duration information appears below the map</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              This is the exact same SuperSimpleMap component used in the main booking form.
            </p>
            <a 
              href="/dashboard/book" 
              className="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Go to Main Booking Form →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
