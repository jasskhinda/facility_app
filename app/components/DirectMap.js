'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * DirectMap - Ultra-direct approach to fix Route Overview
 * This component bypasses all existing Google Maps loading and does it directly
 */
export default function DirectMap({ 
  origin, 
  destination, 
  onRouteCalculated = null,
  className = "w-full h-64 rounded-lg border border-gray-200"
}) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Map instances stored in refs to avoid re-renders
  const mapInstance = useRef(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);

  useEffect(() => {
    console.log('🚀 DirectMap: Starting direct approach...');
    setDebugInfo('Starting...');
    
    let isActive = true;

    const directInit = async () => {
      try {
        setStatus('checking');
        setDebugInfo('Checking environment...');

        // Step 1: Check if we have what we need
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('No API key found');
        }

        if (!mapRef.current) {
          throw new Error('Map container not available');
        }

        setDebugInfo(`API Key: ${apiKey.substring(0, 10)}...`);

        // Step 2: Force load Google Maps if not available
        if (!window.google || !window.google.maps) {
          setStatus('loading');
          setDebugInfo('Loading Google Maps script...');
          
          await loadGoogleMapsForced(apiKey);
          
          if (!isActive) return;
        }

        // Step 3: Verify Google Maps is ready
        if (!window.google || !window.google.maps) {
          throw new Error('Google Maps failed to load');
        }

        setDebugInfo('Google Maps loaded, creating map...');

        // Step 4: Create map directly
        setStatus('creating');
        
        console.log('📍 Creating map with Google Maps API...');
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: 39.9612, lng: -82.9988 },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        directionsService.current = new window.google.maps.DirectionsService();
        directionsRenderer.current = new window.google.maps.DirectionsRenderer({
          polylineOptions: {
            strokeColor: '#7CCFD0',
            strokeWeight: 4,
            strokeOpacity: 0.8,
          },
        });

        directionsRenderer.current.setMap(mapInstance.current);

        setStatus('ready');
        setDebugInfo('Map ready!');
        setError('');
        
        console.log('✅ DirectMap: Ready!');

      } catch (err) {
        console.error('❌ DirectMap error:', err);
        setError(err.message);
        setStatus('error');
        setDebugInfo(`Error: ${err.message}`);
      }
    };

    directInit();

    return () => {
      isActive = false;
    };
  }, []);

  // Calculate route when ready and addresses available
  useEffect(() => {
    if (status !== 'ready' || !origin || !destination || !directionsService.current) {
      return;
    }

    console.log('🛣️ DirectMap: Calculating route...');
    setDebugInfo(`Calculating route: ${origin} → ${destination}`);

    const request = {
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.IMPERIAL
    };

    directionsService.current.route(request, (result, status) => {
      console.log('🛣️ Route result:', status);
      
      if (status === 'OK' && result) {
        directionsRenderer.current.setDirections(result);
        
        const route = result.routes[0];
        const leg = route.legs[0];
        
        const routeData = {
          distance: {
            text: leg.distance.text,
            value: leg.distance.value,
            miles: Math.round((leg.distance.value * 0.000621371) * 100) / 100
          },
          duration: {
            text: leg.duration.text,
            value: leg.duration.value
          },
          startAddress: leg.start_address,
          endAddress: leg.end_address
        };
        
        setRouteInfo(routeData);
        setDebugInfo(`Route ready: ${routeData.distance.text}, ${routeData.duration.text}`);
        
        if (onRouteCalculated) {
          onRouteCalculated(routeData);
        }
      } else {
        setError(`Route calculation failed: ${status}`);
        setDebugInfo(`Route error: ${status}`);
      }
    });
  }, [origin, destination, status]);

  const renderStatus = () => {
    switch (status) {
      case 'starting':
      case 'checking':
        return (
          <div className="flex items-center justify-center h-full bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-center p-4">
              <div className="animate-pulse h-4 w-4 bg-blue-400 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-blue-600">Starting map...</p>
              <p className="text-xs text-blue-500">{debugInfo}</p>
            </div>
          </div>
        );
      
      case 'loading':
        return (
          <div className="flex items-center justify-center h-full bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-center p-4">
              <div className="animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-yellow-600">Loading Google Maps...</p>
              <p className="text-xs text-yellow-500">{debugInfo}</p>
            </div>
          </div>
        );

      case 'creating':
        return (
          <div className="flex items-center justify-center h-full bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-center p-4">
              <div className="animate-bounce h-4 w-4 bg-purple-400 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-purple-600">Creating map...</p>
              <p className="text-xs text-purple-500">{debugInfo}</p>
            </div>
          </div>
        );
      
      case 'ready':
        return <div ref={mapRef} className="w-full h-full rounded-lg" />;
      
      case 'error':
        return (
          <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center p-4">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <p className="text-xs text-red-500 mb-2">{debugInfo}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Unknown status: {status}</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className={className}>
        {renderStatus()}
      </div>

      {routeInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-green-800">{routeInfo.distance.text}</span>
              <span className="text-green-600 ml-1">({routeInfo.distance.miles} miles)</span>
            </div>
            <div>
              <span className="font-medium text-green-800">{routeInfo.duration.text}</span>
            </div>
          </div>
        </div>
      )}

      {/* Debug info for development */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
        Status: {status} | Debug: {debugInfo}
      </div>
    </div>
  );
}

/**
 * Force load Google Maps with a promise
 */
function loadGoogleMapsForced(apiKey) {
  return new Promise((resolve, reject) => {
    // Remove any existing scripts to start fresh
    const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    existingScripts.forEach(script => {
      console.log('🗑️ Removing existing Google Maps script');
      script.remove();
    });

    // Create fresh script
    const script = document.createElement('script');
    const callbackName = `directMapInit_${Date.now()}`;
    
    // Global callback
    window[callbackName] = () => {
      console.log('✅ Google Maps loaded via direct callback');
      delete window[callbackName];
      resolve();
    };

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      console.error('❌ Failed to load Google Maps script');
      reject(new Error('Failed to load Google Maps script'));
    };

    console.log('📜 Loading fresh Google Maps script:', script.src);
    document.head.appendChild(script);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (window[callbackName]) {
        delete window[callbackName];
        reject(new Error('Timeout loading Google Maps'));
      }
    }, 30000);
  });
}
