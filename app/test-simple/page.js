'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import components to prevent SSR issues
const AddressAutocompleteSimple = dynamic(() => import('../components/AddressAutocompleteSimple'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
});

const RouteMapDisplaySimple = dynamic(() => import('../components/RouteMapDisplaySimple'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded"></div>
});

export default function TestSimplePage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Simple Google Maps Test</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium">Pickup Address</label>
          <AddressAutocompleteSimple
            value={origin}
            onChange={setOrigin}
            placeholder="Enter pickup address"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block mb-2 font-medium">Destination Address</label>
          <AddressAutocompleteSimple
            value={destination}
            onChange={setDestination}
            placeholder="Enter destination address"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Route Overview</h2>
        <RouteMapDisplaySimple
          origin={origin}
          destination={destination}
          onRouteCalculated={setRouteInfo}
          className="w-full h-96 rounded-lg border border-gray-200"
        />
      </div>
      
      {routeInfo && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Route Information</h2>
          <pre className="bg-white p-4 rounded overflow-auto text-sm">
            {JSON.stringify(routeInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <p>Origin: {origin || 'Not set'}</p>
        <p>Destination: {destination || 'Not set'}</p>
        <p>Route Info: {routeInfo ? 'Calculated' : 'Not calculated'}</p>
      </div>
    </div>
  );
}
