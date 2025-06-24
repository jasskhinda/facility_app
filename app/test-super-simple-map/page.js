'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components to prevent SSR issues
const SuperSimpleMap = dynamic(() => import('../components/SuperSimpleMap'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-blue-600">Loading SuperSimpleMap...</p>
    </div>
  </div>
});

const SimpleAutocomplete = dynamic(() => import('../components/SimpleAutocomplete'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
});

const GoogleMapsDebug = dynamic(() => import('../components/GoogleMapsDebug'), {
  ssr: false,
  loading: () => <div>Loading debug...</div>
});

export default function TestSuperSimpleMapPage() {
  const [origin, setOrigin] = useState('123 Main St, Columbus, OH');
  const [destination, setDestination] = useState('456 High St, Columbus, OH');
  const [routeInfo, setRouteInfo] = useState(null);

  const handleRouteCalculated = (info) => {
    console.log('Route calculated:', info);
    setRouteInfo(info);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🗺️ SuperSimpleMap Test
          </h1>
          <p className="text-gray-600">
            Testing the enhanced SuperSimpleMap component for Route Overview
          </p>
        </div>

        {/* Google Maps Debug Info */}
        <div className="mb-6">
          <GoogleMapsDebug />
        </div>

        {/* Address Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 gap-6 mb-8">
            <div>
              <label className="block mb-2 font-medium text-lg">🚗 Pickup Address</label>
              <SimpleAutocomplete
                value={origin}
                onChange={setOrigin}
                placeholder="Enter pickup address"
                className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block mb-2 font-medium text-lg">🎯 Destination Address</label>
              <SimpleAutocomplete
                value={destination}
                onChange={setDestination}
                placeholder="Enter destination address"
                className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {origin && destination && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4 text-green-700">
                🗺️ SuperSimpleMap - Enhanced Route Overview
              </h2>
              <SuperSimpleMap
                origin={origin}
                destination={destination}
                onRouteCalculated={handleRouteCalculated}
                className="w-full h-96 rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>

        {/* Route Information Display */}
        {routeInfo && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-700">📊 Route Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800">Distance</h4>
                <p className="text-2xl font-bold text-blue-900">{routeInfo.distance.text}</p>
                <p className="text-sm text-blue-600">{routeInfo.distance.miles} miles</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800">Duration</h4>
                <p className="text-2xl font-bold text-green-900">{routeInfo.duration.text}</p>
                <p className="text-sm text-green-600">driving time</p>
              </div>
            </div>
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Raw Data (for debugging)</h4>
              <pre className="text-xs text-gray-600 overflow-auto">
                {JSON.stringify(routeInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Test Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">🧪 Test Instructions</h3>
          <div className="text-yellow-700 space-y-2">
            <p><strong>1.</strong> Enter different pickup and destination addresses</p>
            <p><strong>2.</strong> Watch the loading states and ensure no "Initializing map..." stuck state</p>
            <p><strong>3.</strong> Verify route appears on map with blue line between locations</p>
            <p><strong>4.</strong> Check that route information displays correctly below map</p>
            <p><strong>5.</strong> Test with various address combinations</p>
          </div>
          
          <div className="mt-4 bg-yellow-100 p-3 rounded">
            <h4 className="font-medium text-yellow-800">Expected Behavior:</h4>
            <ul className="list-disc list-inside space-y-1 text-yellow-700 text-sm mt-2">
              <li>Clear loading indicators with progress messages</li>
              <li>Smooth transition from loading to map display</li>
              <li>Accurate route calculation and display</li>
              <li>Helpful error messages if something goes wrong</li>
              <li>No hanging "Initializing..." states</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            This tests the exact SuperSimpleMap component used in the main booking form Route Overview section.
          </p>
          <a 
            href="/dashboard/book" 
            className="inline-block mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Test in Main Booking Form →
          </a>
        </div>
      </div>
    </div>
  );
}
