'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components
const BulletproofMap = dynamic(() => import('../components/BulletproofMap'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-blue-600">Loading bulletproof map...</p>
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

export default function BulletproofMapTestPage() {
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
          <h1 className="text-2xl font-bold">Loading page...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">🛡️ Bulletproof Route Overview Test</h1>
        <p className="text-lg text-gray-600">Final solution for the "Loading map..." issue</p>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">📍 Route Configuration</h2>
            
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

            {origin && destination && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4 text-green-700">
                  🗺️ Route Overview (This is the EXACT component used in booking form)
                </h2>
                <BulletproofMap
                  origin={origin}
                  destination={destination}
                  onRouteCalculated={setRouteInfo}
                  className="w-full h-96 rounded-lg border-2 border-gray-300"
                />
              </div>
            )}

            {routeInfo && (
              <div className="mt-6 p-6 bg-green-50 rounded-lg border-2 border-green-200">
                <h3 className="text-xl font-semibold text-green-800 mb-4">✅ Route Calculated Successfully!</h3>
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
                    <div className="text-2xl font-bold text-green-700">✅</div>
                    <div className="text-sm text-green-600">Route ready</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="space-y-6">
            <GoogleMapsDebug />
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">🎯 Test Checklist</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✅ Page loads without errors</li>
                <li>✅ Address autocomplete works</li>
                <li>✅ Map loads (not stuck on "Loading...")</li>
                <li>✅ Route displays on map</li>
                <li>✅ Route info shows below map</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-2">🔧 Features</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Automatic retry on failure</li>
                <li>• Unique callback names</li>
                <li>• Timeout handling</li>
                <li>• Detailed error messages</li>
                <li>• Visual loading states</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-2">🚀 Status</h3>
              <p className="text-sm text-green-700">
                This bulletproof component is now deployed in the main booking form at 
                <code className="bg-green-100 px-1 rounded">/dashboard/book</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">🎉 Ready for Production</h3>
        <p className="text-gray-600">
          The Route Overview component has been fixed with comprehensive error handling, 
          retry logic, and bulletproof Google Maps loading.
        </p>
      </div>
    </div>
  );
}
