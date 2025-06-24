'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Direct map component
const DirectMap = dynamic(() => import('../components/DirectMap'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-blue-600 font-medium">Loading DirectMap...</p>
    </div>
  </div>
});

const SimpleAutocomplete = dynamic(() => import('../components/SimpleAutocomplete'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
});

export default function DirectMapTestPage() {
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
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🎯 DirectMap Test - Route Overview Fix</h1>
        <p className="text-lg text-gray-600">Ultra-direct approach to fix "Initializing map..." issue</p>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg inline-block">
          <p className="text-sm text-yellow-800">
            <span className="font-bold">Issue:</span> Route Overview stuck at "Initializing map..."<br/>
            <span className="font-bold">Solution:</span> DirectMap bypasses all existing Google Maps loading
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">📍 Test Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block mb-2 font-medium text-lg">🚪 Pickup Address</label>
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

            <div className="border-4 border-dashed border-red-300 rounded-lg p-6 bg-red-50">
              <h2 className="text-2xl font-semibold mb-4 text-red-700">
                🎯 DirectMap Route Overview (TESTING FIX)
              </h2>
              <p className="text-red-600 mb-4">
                This should NOT get stuck at "Initializing map..." anymore!
              </p>
              
              {origin && destination ? (
                <DirectMap
                  origin={origin}
                  destination={destination}
                  onRouteCalculated={setRouteInfo}
                  className="w-full h-96 rounded-lg border-2 border-red-300"
                />
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg border-2 border-gray-300">
                  <p className="text-gray-600">Enter pickup and destination to see route</p>
                </div>
              )}
            </div>

            {routeInfo && (
              <div className="mt-6 p-6 bg-green-50 rounded-lg border-2 border-green-200">
                <h3 className="text-xl font-semibold text-green-800 mb-4">✅ SUCCESS! Route Calculated!</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-lg border border-green-300">
                    <div className="text-2xl font-bold text-green-700">{routeInfo.distance.text}</div>
                    <div className="text-sm text-green-600">({routeInfo.distance.miles} miles)</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-300">
                    <div className="text-2xl font-bold text-green-700">{routeInfo.duration.text}</div>
                    <div className="text-sm text-green-600">Drive time</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg border border-green-300">
                    <div className="text-2xl font-bold text-green-700">🎉</div>
                    <div className="text-sm text-green-600">Fixed!</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">🔍 What DirectMap Does</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Removes existing Google Maps scripts</li>
                <li>• Loads fresh script with unique callback</li>
                <li>• Forces direct initialization</li>
                <li>• Shows detailed debug info</li>
                <li>• No conflicts with other components</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-2">✅ Expected Results</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• ✅ Map loads (not stuck)</li>
                <li>• ✅ Shows loading progress</li>
                <li>• ✅ Displays route on map</li>
                <li>• ✅ Route info appears below</li>
                <li>• ✅ No "Initializing..." freeze</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-2">⚠️ Troubleshooting</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Check debug info below map</li>
                <li>• Watch browser console for logs</li>
                <li>• Reload page if needed</li>
                <li>• API key must be valid</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="font-bold text-purple-800 mb-2">🚀 Deployment</h3>
              <p className="text-sm text-purple-700">
                If this test works, DirectMap is already deployed in the main booking form at 
                <code className="bg-purple-100 px-1 rounded">/dashboard/book</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
