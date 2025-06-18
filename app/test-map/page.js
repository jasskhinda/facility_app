'use client';

import { useState, useEffect } from 'react';
import RouteMapDisplay from '../components/RouteMapDisplay';

export default function TestMapPage() {
  const [origin, setOrigin] = useState('123 Main St, Columbus, OH');
  const [destination, setDestination] = useState('456 High St, Columbus, OH');
  const [routeInfo, setRouteInfo] = useState(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Map Integration</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium">Origin</label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block mb-2 font-medium">Destination</label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Map Display</h2>
        <RouteMapDisplay
          origin={origin}
          destination={destination}
          onRouteCalculated={setRouteInfo}
        />
      </div>
      
      {routeInfo && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Route Information</h2>
          <pre className="bg-white p-4 rounded overflow-auto">
            {JSON.stringify(routeInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
