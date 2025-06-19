'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * SuperSimpleMap - Just show a route between two addresses
 * No complex loading states, just basic functionality
 */
export default function SuperSimpleMap({ 
  origin, 
  destination, 
  onRouteCalculated = null,
  className = "w-full h-64 rounded-lg border border-gray-200"
}) {
  const mapRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    if (!origin || !destination) {
      setIsLoading(false);
      return;
    }

    console.log('SuperSimpleMap: Starting route calculation for', origin, 'to', destination);
    setIsLoading(true);
    setError('');
    setRouteInfo(null);

    const initMapWithRetry = (retryCount = 0) => {
      console.log('SuperSimpleMap: Attempting to initialize map (attempt', retryCount + 1, ')');
      
      // Check if map container is ready
      if (!mapRef.current) {
        console.log('SuperSimpleMap: Map container not ready, will retry...');
        
        // Retry up to 10 times with increasing delays
        if (retryCount < 10) {
          const delay = Math.min(100 * (retryCount + 1), 500); // Progressive delay up to 500ms
          setTimeout(() => {
            initMapWithRetry(retryCount + 1);
          }, delay);
        } else {
          console.error('SuperSimpleMap: Map container still not ready after', retryCount + 1, 'attempts');
          setError('Map container failed to initialize after multiple attempts. Please refresh the page.');
          setIsLoading(false);
        }
        return;
      }

      console.log('SuperSimpleMap: Map container ready, proceeding with initialization');

      try {
        // Create the map
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 13,
          center: { lat: 39.9612, lng: -82.9988 }, // Columbus, OH
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        console.log('SuperSimpleMap: Map created successfully');

        // Create directions service and renderer
        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer({
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#4285F4',
            strokeWeight: 4,
          },
        });

        directionsRenderer.setMap(map);
        console.log('SuperSimpleMap: Directions renderer ready');

        // Calculate route
        const request = {
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        };

        console.log('SuperSimpleMap: Calculating route...');
        directionsService.route(request, (result, status) => {
          console.log('SuperSimpleMap: Route calculation result:', status);
          
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Extract route info
            const route = result.routes[0];
            const leg = route.legs[0];
            
            const info = {
              distance: {
                text: leg.distance.text,
                value: leg.distance.value,
                miles: Math.round((leg.distance.value * 0.000621371) * 100) / 100
              },
              duration: {
                text: leg.duration.text,
                value: leg.duration.value
              }
            };
            
            console.log('SuperSimpleMap: Route calculated successfully:', info);
            setRouteInfo(info);
            if (onRouteCalculated) {
              onRouteCalculated(info);
            }
            
            setIsLoading(false);
            setError('');
          } else {
            console.error('SuperSimpleMap: Route calculation failed:', status);
            setError(`Could not calculate route: ${status}`);
            setIsLoading(false);
          }
        });

      } catch (err) {
        console.error('SuperSimpleMap: Error initializing map:', err);
        setError(`Failed to load map: ${err.message}`);
        setIsLoading(false);
      }
    };

    // Enhanced Google Maps loading with better error handling
    if (typeof window === 'undefined') {
      setError('Window not available');
      setIsLoading(false);
      return;
    }

    // Check if Google Maps is already available
    if (window.google && window.google.maps) {
      console.log('SuperSimpleMap: Google Maps already available');
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        initMapWithRetry();
      }, 50);
      return;
    }

    console.log('SuperSimpleMap: Waiting for Google Maps to load...');
    
    // Simple polling for Google Maps availability
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds with 100ms intervals
    
    const checkForGoogleMaps = setInterval(() => {
      attempts++;
      
      if (window.google && window.google.maps) {
        console.log('SuperSimpleMap: Google Maps loaded after', attempts, 'attempts');
        clearInterval(checkForGoogleMaps);
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          initMapWithRetry();
        }, 50);
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error('SuperSimpleMap: Timeout waiting for Google Maps');
        clearInterval(checkForGoogleMaps);
        setError('Google Maps failed to load. Please refresh the page.');
        setIsLoading(false);
      }
    }, 100);

    // Cleanup function
    return () => {
      clearInterval(checkForGoogleMaps);
    };

  }, [origin, destination, onRouteCalculated]);

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center p-4">
            <div className="text-red-600 mb-2">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 text-sm font-medium mb-3">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  setError('');
                  setIsLoading(true);
                  // Force re-initialization
                  setTimeout(() => {
                    if (origin && destination) {
                      console.log('SuperSimpleMap: Manual retry triggered');
                      // Trigger useEffect by clearing and setting addresses
                      const currentOrigin = origin;
                      const currentDestination = destination;
                      // This will trigger the useEffect again
                      window.location.reload();
                    }
                  }, 100);
                }}
                className="px-4 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors block mx-auto"
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors block mx-auto"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="relative mx-auto mb-3">
              <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-blue-600 text-sm font-medium">Loading route map...</p>
            <p className="text-blue-500 text-xs mt-1">Calculating best route between locations</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={className}>
        <div ref={mapRef} className="w-full h-full rounded-lg" />
      </div>
      
      {routeInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-lg font-bold text-green-800">{routeInfo.distance.text}</div>
                <div className="text-xs text-green-600">({routeInfo.distance.miles} miles)</div>
              </div>
              <div className="h-8 w-px bg-green-300"></div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-800">{routeInfo.duration.text}</div>
                <div className="text-xs text-green-600">driving time</div>
              </div>
            </div>
            <div className="text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
