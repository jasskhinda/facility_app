'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import useGoogleMaps from '@/hooks/useGoogleMaps';

// Dynamically import components to prevent SSR issues
const RouteMapDisplay = dynamic(() => import('../components/RouteMapDisplay'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-96 rounded"></div>
});

const AddressAutocomplete = dynamic(() => import('../components/AddressAutocomplete'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
});

export default function TestMapPage() {
  const [origin, setOrigin] = useState('123 Main St, Columbus, OH');
  const [destination, setDestination] = useState('456 High St, Columbus, OH');
  const [routeInfo, setRouteInfo] = useState(null);
  const { isLoaded: mapsLoaded, loadError } = useGoogleMaps(['places']);
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Collect debug information about Google Maps
    const timer = setInterval(() => {
      setDebugInfo({
        timestamp: new Date().toISOString(),
        googleMapsHook: {
          isLoaded: mapsLoaded,
          hasError: !!loadError,
          errorMessage: loadError?.message || null
        },
        windowGoogle: typeof window !== 'undefined' && !!window.google,
        windowGoogleMaps: typeof window !== 'undefined' && !!window.google && !!window.google.maps,
        windowGoogleMapsPlaces: typeof window !== 'undefined' && !!window.google && !!window.google.maps && !!window.google.maps.places,
        apiKeyExists: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        apiKeyFirstFour: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 4) : null
      });
    }, 2000);
    
    return () => clearInterval(timer);
  }, [mapsLoaded, loadError]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Map Integration</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-8">
        <div>
          <label className="block mb-2 font-medium">Origin</label>
          <AddressAutocomplete
            value={origin}
            onChange={setOrigin}
            placeholder="Enter origin address"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <label className="block mb-2 font-medium">Destination</label>
          <AddressAutocomplete
            value={destination}
            onChange={setDestination}
            placeholder="Enter destination address"
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
      
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
        <p>API Key available: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Yes' : 'No'}</p>
        <p>Maps Loaded via Hook: {mapsLoaded ? 'Yes' : 'No'}</p>
        
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Debug Information</h3>
          <pre className="bg-white p-4 rounded overflow-auto text-xs">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
