'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import to prevent SSR issues
const UltraSimpleMap = dynamic(() => import('../components/UltraSimpleMap'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>
});

const SimpleAutocomplete = dynamic(() => import('../components/SimpleAutocomplete'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
});

const GoogleMapsDebug = dynamic(() => import('../components/GoogleMapsDebug'), {
  ssr: false,
  loading: () => <div>Loading debug...</div>
});

export default function TestUltraSimpleMapPage() {
  const [origin, setOrigin] = useState('1234 Main St, Columbus, OH');
  const [destination, setDestination] = useState('5678 High St, Columbus, OH');
  const [routeInfo, setRouteInfo] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-center">🗺️ Route Overview Debug Test</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 gap-6 mb-8">
              <div>
                <label className="block mb-2 font-medium text-lg">Pickup Address</label>
                <SimpleAutocomplete
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Enter pickup address"
                  className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-medium text-lg">Destination Address</label>
                <SimpleAutocomplete
                  value={destination}
                  onChange={setDestination}
                  placeholder="Enter destination address"
                  className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {origin && destination && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">🗺️ Route Overview (This should work!)</h2>
                <UltraSimpleMap
                  origin={origin}
                  destination={destination}
                  onRouteCalculated={setRouteInfo}
                  className="w-full h-96 rounded-lg border-2 border-gray-300"
                />
              </div>
            )}

            {routeInfo && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-2">✅ Route Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Distance:</span> {routeInfo.distance.text} ({routeInfo.distance.miles} miles)
                  </div>
                  <div>
                    <span className="font-medium">Duration:</span> {routeInfo.duration.text}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <GoogleMapsDebug />
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm">
            <h3 className="font-semibold text-blue-800 mb-2">🔧 Test Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Check that debug shows ✅ for Google Maps</li>
              <li>Enter pickup and destination addresses</li>
              <li>Map should load and show route</li>
              <li>Route info should appear below map</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-sm">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Common Issues</h3>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>API key not loaded</li>
              <li>Multiple scripts conflict</li>
              <li>Callback name collision</li>
              <li>Timeout waiting for Google Maps</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <p className="text-gray-600">
          This page tests the exact same Route Overview functionality used in the main booking form.
        </p>
      </div>
    </div>
  );
}
