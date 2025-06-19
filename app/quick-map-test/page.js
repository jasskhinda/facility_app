'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import only the SuperSimpleMap component for testing
const SuperSimpleMap = dynamic(() => import('../components/SuperSimpleMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-blue-600 text-sm">Loading SuperSimpleMap...</p>
    </div>
  </div>
});

export default function QuickMapTestPage() {
  const [routeInfo, setRouteInfo] = useState(null);

  // Pre-filled test addresses
  const pickup = "123 Main St, Columbus, OH";
  const destination = "456 High St, Columbus, OH";

  const handleRouteCalculated = (info) => {
    console.log('✅ Route calculated successfully:', info);
    setRouteInfo(info);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            🚀 Quick Map Test
          </h1>
          <p className="text-gray-600 text-lg">
            Testing SuperSimpleMap with pre-filled addresses
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* Test Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">🧪 Test Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Pickup:</span>
                <p className="text-blue-900">{pickup}</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Destination:</span>
                <p className="text-blue-900">{destination}</p>
              </div>
            </div>
          </div>

          {/* SuperSimpleMap Test */}
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              🗺️ Route Overview (SuperSimpleMap Component)
            </h3>
            <SuperSimpleMap
              origin={pickup}
              destination={destination}
              onRouteCalculated={handleRouteCalculated}
              className="w-full h-96 rounded-lg border border-gray-200"
            />
          </div>

          {/* Success Indicator */}
          {routeInfo && (
            <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-4">
                <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-green-800">✅ SUCCESS! Route Calculated</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{routeInfo.distance.text}</div>
                  <div className="text-sm text-green-600">Total Distance</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{routeInfo.distance.miles}</div>
                  <div className="text-sm text-green-600">Miles</div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{routeInfo.duration.text}</div>
                  <div className="text-sm text-green-600">Drive Time</div>
                </div>
              </div>
            </div>
          )}

          {/* Status & Instructions */}
          <div className="mt-8 space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Expected Behavior:</h4>
              <ul className="list-disc list-inside space-y-1 text-yellow-700 text-sm">
                <li>Map should load without getting stuck on "Initializing map..."</li>
                <li>Blue route line should appear between the two addresses</li>
                <li>Route information should display below the map</li>
                <li>No errors in browser console</li>
              </ul>
            </div>

            <div className="text-center">
              <a 
                href="/dashboard/book" 
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors mr-4"
              >
                Test in Booking Form →
              </a>
              <a 
                href="/route-overview-test" 
                className="inline-block px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                Full Demo Page →
              </a>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">🔍 Debug Information</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>API Key Available: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Yes' : '❌ No'}</div>
            <div>Environment: {process.env.NODE_ENV}</div>
            <div>Component: SuperSimpleMap</div>
            <div>Last Updated: {new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
