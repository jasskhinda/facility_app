'use client';

import { useState } from 'react';
import SimpleAutocomplete from '../components/SimpleAutocomplete';
import SimpleMap from '../components/SimpleMap';

export default function TestUltraSimplePage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Ultra Simple Google Maps Test</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium text-lg">Pickup Address</label>
          <SimpleAutocomplete
            value={origin}
            onChange={setOrigin}
            placeholder="Enter pickup address"
            className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
          />
        </div>
        
        <div>
          <label className="block mb-2 font-medium text-lg">Destination Address</label>
          <SimpleAutocomplete
            value={destination}
            onChange={setDestination}
            placeholder="Enter destination address"
            className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
          />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Route Overview</h2>
        <SimpleMap
          origin={origin}
          destination={destination}
          onRouteCalculated={setRouteInfo}
          className="w-full h-96 rounded-lg border-2 border-gray-300"
        />
      </div>
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2 text-lg">Current Values</h3>
        <p><strong>Pickup:</strong> {origin || 'Not set'}</p>
        <p><strong>Destination:</strong> {destination || 'Not set'}</p>
        <p><strong>Route Status:</strong> {routeInfo ? 'Calculated' : 'Not calculated'}</p>
        
        {routeInfo && (
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium mb-2">Route Details</h4>
            <p>Distance: {routeInfo.distance.text} ({routeInfo.distance.miles} miles)</p>
            <p>Duration: {routeInfo.duration.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
