'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * BulletproofMap - Final solution for Route Overview
 * This component is designed to work reliably in all environments
 */
export default function BulletproofMap({ 
  origin, 
  destination, 
  onRouteCalculated = null,
  className = "w-full h-64 rounded-lg border border-gray-200"
}) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('initializing'); // initializing, loading, ready, error
  const [error, setError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Map instances
  const [mapInstance, setMapInstance] = useState(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);

  // Maximum retry attempts
  const MAX_RETRIES = 3;

  useEffect(() => {
    console.log('🗺️ BulletproofMap: Initializing...');
    let isMounted = true;
    let timeoutId;
    let intervalId;

    const initMap = () => {
      if (!isMounted || !mapRef.current) return;

      try {
        console.log('🗺️ Creating map instance...');
        
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: 39.9612, lng: -82.9988 }, // Columbus, OH
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

        directionsRenderer.current.setMap(map);
        setMapInstance(map);
        setStatus('ready');
        setError('');
        
        console.log('✅ BulletproofMap: Map ready!');
      } catch (err) {
        console.error('❌ Error creating map:', err);
        setError(`Map initialization failed: ${err.message}`);
        setStatus('error');
      }
    };

    const checkAndLoadGoogleMaps = () => {
      // Check if Google Maps is already available
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps already loaded');
        initMap();
        return;
      }

      setStatus('loading');
      
      // Check for existing script
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('📜 Google Maps script exists, waiting...');
        
        // Set up polling to check when it loads
        intervalId = setInterval(() => {
          if (!isMounted) return;
          
          if (window.google && window.google.maps) {
            clearInterval(intervalId);
            initMap();
          }
        }, 200);
        
        // Timeout after 20 seconds
        timeoutId = setTimeout(() => {
          if (!isMounted) return;
          
          clearInterval(intervalId);
          if (!window.google || !window.google.maps) {
            console.log('⏰ Timeout waiting for existing script');
            handleRetry();
          }
        }, 20000);
        return;
      }

      // Load Google Maps script
      console.log('📜 Loading Google Maps script...');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setError('Google Maps API key not configured');
        setStatus('error');
        return;
      }

      const script = document.createElement('script');
      const callbackName = `initGoogleMapsBulletproof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create unique global callback
      window[callbackName] = () => {
        console.log('📞 Google Maps callback fired');
        if (isMounted) {
          initMap();
        }
        // Clean up callback
        try {
          delete window[callbackName];
        } catch (e) {
          window[callbackName] = undefined;
        }
      };

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        console.error('❌ Failed to load Google Maps script');
        if (isMounted) {
          handleRetry();
        }
      };

      document.head.appendChild(script);
      
      // Backup timeout
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        
        if (!window.google || !window.google.maps) {
          console.log('⏰ Script load timeout');
          handleRetry();
        }
      }, 15000);
    };

    const handleRetry = () => {
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setRetryCount(prev => prev + 1);
        setStatus('initializing');
        setTimeout(checkAndLoadGoogleMaps, 2000);
      } else {
        console.error('❌ Max retries reached');
        setError('Failed to load Google Maps after multiple attempts');
        setStatus('error');
      }
    };

    // Start the process
    checkAndLoadGoogleMaps();

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [retryCount]);

  // Calculate route when addresses change
  useEffect(() => {
    if (status !== 'ready' || !origin || !destination || !directionsService.current || !directionsRenderer.current) {
      return;
    }

    console.log('🛣️ Calculating route:', origin, 'to', destination);

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
        console.log('✅ Route calculated:', routeData);
        
        if (onRouteCalculated) {
          onRouteCalculated(routeData);
        }
      } else {
        console.error('❌ Route calculation failed:', status);
        setError('Unable to calculate route between addresses');
      }
    });
  }, [origin, destination, status]);

  const renderContent = () => {
    switch (status) {
      case 'initializing':
        return (
          <div className="flex items-center justify-center h-full bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-center p-4">
              <div className="animate-pulse h-6 w-6 bg-blue-300 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-blue-600">Initializing map...</p>
            </div>
          </div>
        );
      
      case 'loading':
        return (
          <div className="flex items-center justify-center h-full bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-center p-4">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-blue-600">Loading Google Maps...</p>
              {retryCount > 0 && <p className="text-xs text-blue-500">Retry {retryCount}/{MAX_RETRIES}</p>}
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center p-4">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              <button 
                onClick={() => {
                  setError('');
                  setStatus('initializing');
                  setRetryCount(0);
                }}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                Try Again
              </button>
            </div>
          </div>
        );
      
      case 'ready':
        return <div ref={mapRef} className="w-full h-full rounded-lg" />;
      
      default:
        return (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Unknown state</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className={className}>
        {renderContent()}
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
    </div>
  );
}
