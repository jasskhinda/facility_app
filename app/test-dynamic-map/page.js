'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Test the exact same dynamic import pattern as StreamlinedBookingForm
const SuperSimpleMap = dynamic(() => import('../components/SuperSimpleMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">Loading map component...</p>
      </div>
    </div>
  )
});

export default function TestDynamicMapPage() {
  const [pickup, setPickup] = useState('5050 Blazer Pkwy #100, Dublin, OH 43017, USA');
  const [destination, setDestination] = useState('1234 Main St, Columbus, OH 43215, USA');
  const [routeInfo, setRouteInfo] = useState(null);
  const [testStatus, setTestStatus] = useState('waiting');

  useEffect(() => {
    // Start test after component mounts
    const timer = setTimeout(() => {
      setTestStatus('testing');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleRouteCalculated = (info) => {
    console.log('✅ Route calculated successfully:', info);
    setRouteInfo(info);
    setTestStatus('success');
  };

  const testAddresses = [
    {
      pickup: '123 E Broad St, Columbus, OH 43215, USA',
      destination: '456 N High St, Columbus, OH 43215, USA',
      name: 'Columbus City Test'
    },
    {
      pickup: '5050 Blazer Pkwy #100, Dublin, OH 43017, USA', 
      destination: '1234 Polaris Pkwy, Columbus, OH 43240, USA',
      name: 'Dublin to Polaris Test'
    },
    {
      pickup: '100 City Park Ave, Columbus, OH 43215, USA',
      destination: '200 Civic Center Dr, Columbus, OH 43215, USA',
      name: 'Short Distance Test'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Dynamic Import Map Test
          </h1>
          <p className="text-gray-600">
            Testing SuperSimpleMap with the exact same dynamic import pattern used in production
          </p>
          <div className="mt-4 inline-flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              testStatus === 'waiting' ? 'bg-yellow-400' :
              testStatus === 'testing' ? 'bg-blue-400 animate-pulse' :
              testStatus === 'success' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-sm font-medium">
              Status: {testStatus === 'waiting' ? 'Waiting to start' :
                      testStatus === 'testing' ? 'Testing map loading' :
                      testStatus === 'success' ? 'Map loaded successfully' : 'Test failed'}
            </span>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Addresses</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {testAddresses.map((test, index) => (
              <button
                key={index}
                onClick={() => {
                  setPickup(test.pickup);
                  setDestination(test.destination);
                  setTestStatus('testing');
                  setRouteInfo(null);
                }}
                className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
              >
                <div className="font-medium text-sm text-blue-700">{test.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {test.pickup.split(',')[0]} → {test.destination.split(',')[0]}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address</label>
              <input
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter pickup address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Destination Address</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter destination address"
              />
            </div>
          </div>
        </div>

        {/* Map Component Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">SuperSimpleMap Component</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            {pickup && destination ? (
              <SuperSimpleMap
                origin={pickup}
                destination={destination}
                onRouteCalculated={handleRouteCalculated}
                className="w-full h-96 rounded-lg border border-gray-200"
              />
            ) : (
              <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg">
                <p className="text-gray-500">Enter both pickup and destination addresses to see the map</p>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {routeInfo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Test Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{routeInfo.distance.text}</div>
                <div className="text-sm text-green-600">Distance ({routeInfo.distance.miles} miles)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{routeInfo.duration.text}</div>
                <div className="text-sm text-green-600">Estimated driving time</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded">
              <p className="text-green-800 text-sm">
                <strong>✅ Success:</strong> Map container initialization worked correctly with dynamic import!
              </p>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🔍 Test Instructions</h3>
          <div className="space-y-2 text-blue-700">
            <p><strong>1.</strong> This test uses the exact same dynamic import pattern as the production booking form</p>
            <p><strong>2.</strong> Click the preset test buttons or enter custom addresses</p>
            <p><strong>3.</strong> Watch for the "Map container not ready" error in the console</p>
            <p><strong>4.</strong> The map should load without retrying multiple times</p>
            <p><strong>5.</strong> Route information should appear below the map when successful</p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="text-blue-800 text-sm">
              <strong>Expected Behavior:</strong> Map should load smoothly without "Map container not ready" errors
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
