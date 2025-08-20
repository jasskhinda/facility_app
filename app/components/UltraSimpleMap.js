'use client';

import { useEffect, useRef, useState } from 'react';

export default function UltraSimpleMap({ 
  origin, 
  destination, 
  onRouteCalculated = null,
  className = "w-full h-64 rounded-lg border border-gray-200"
}) {
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [routeInfo, setRouteInfo] = useState(null);
  const [map, setMap] = useState(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);

  useEffect(() => {
    console.log('UltraSimpleMap: Starting...');
    
    let isMounted = true;
    let checkInterval;

    const initializeIfReady = () => {
      if (!isMounted) return;
      
      // Check if Google Maps is ready
      if (window.google && window.google.maps) {
        console.log('Google Maps found, initializing...');
        initializeMap();
        return;
      }

      // Check if there's already a script loading
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script exists, waiting...');
        // Wait for existing script to load
        checkInterval = setInterval(() => {
          if (!isMounted) {
            clearInterval(checkInterval);
            return;
          }
          if (window.google && window.google.maps) {
            clearInterval(checkInterval);
            initializeMap();
          }
        }, 200);
        
        // Timeout after 15 seconds
        setTimeout(() => {
          if (checkInterval) {
            clearInterval(checkInterval);
            if (!window.google || !window.google.maps) {
              setError('Timeout waiting for Google Maps to load');
            }
          }
        }, 15000);
        return;
      }

      // No script exists, load it
      console.log('Loading Google Maps script...');
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        setError('Google Maps API key not configured');
        return;
      }

      const script = document.createElement('script');
      const callbackName = `initGoogleMapsUltra_${Date.now()}`;
      
      // Create unique callback
      window[callbackName] = () => {
        console.log('Google Maps loaded via callback');
        if (isMounted) {
          initializeMap();
        }
        delete window[callbackName];
      };

      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        if (isMounted) {
          setError('Failed to load Google Maps');
        }
      };

      document.head.appendChild(script);
    };

    // Start the initialization process
    initializeIfReady();

    // Cleanup function
    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  const initializeMap = () => {
    try {
      if (!mapRef.current) {
        console.log('Map container not ready');
        return;
      }

      console.log('Initializing map...');
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: { lat: 39.9612, lng: -82.9988 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      directionsServiceRef.current = new window.google.maps.DirectionsService();
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        polylineOptions: {
          strokeColor: '#7CCFD0',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      });

      directionsRendererRef.current.setMap(mapInstance);
      setMap(mapInstance);
      setIsLoaded(true);
      setError('');
      
      console.log('Map initialized successfully!');
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map: ' + err.message);
    }
  };

  // Calculate route when addresses change
  useEffect(() => {
    if (!isLoaded || !origin || !destination || !directionsServiceRef.current) {
      return;
    }

    console.log('Calculating route:', origin, 'to', destination);

    const request = {
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      provideRouteAlternatives: true, // Request alternative routes
      optimizeWaypoints: false,
      avoidHighways: false,
      avoidTolls: false
    };

    directionsServiceRef.current.route(request, (result, status) => {
      console.log('Route calculation result:', status);
      
      if (status === 'OK' && result && result.routes && result.routes.length > 0) {
        console.log(`UltraSimpleMap: Found ${result.routes.length} routes`);
        
        // Log all routes for debugging
        result.routes.forEach((route, index) => {
          const leg = route.legs[0];
          console.log(`Route ${index + 1}: ${leg.distance.text} (${(leg.distance.value * 0.000621371).toFixed(2)} mi), ${leg.duration.text} (${leg.duration.value} seconds)`);
        });
        
        // Find the fastest route (shortest duration)
        let fastestRoute = result.routes[0];
        let shortestDuration = result.routes[0].legs[0].duration.value;
        
        for (let i = 1; i < result.routes.length; i++) {
          const routeDuration = result.routes[i].legs[0].duration.value;
          if (routeDuration < shortestDuration) {
            shortestDuration = routeDuration;
            fastestRoute = result.routes[i];
          }
        }
        
        console.log('UltraSimpleMap: Selected fastest route (shortest duration)');
        directionsRendererRef.current.setDirections({...result, routes: [fastestRoute]});
        
        const leg = fastestRoute.legs[0];
        
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
        console.log('Route calculated successfully:', routeData);
        
        if (onRouteCalculated) {
          onRouteCalculated(routeData);
        }
      } else {
        console.error('Route calculation failed:', status);
        setError('Unable to calculate route: ' + status);
      }
    });
  }, [origin, destination, isLoaded]);

  return (
    <div className="space-y-3">
      <div className={className}>
        {error ? (
          <div className="flex items-center justify-center h-full bg-red-50 border border-red-200 rounded-lg">
            <div className="text-center p-4">
              <p className="text-sm text-red-600">{error}</p>
              <button 
                onClick={() => {
                  setError('');
                  setIsLoaded(false);
                  setTimeout(initializeMap, 100);
                }}
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !isLoaded ? (
          <div className="flex items-center justify-center h-full bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-center p-4">
              <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-blue-600">Loading map...</p>
              <p className="text-xs text-blue-500 mt-1">Waiting for Google Maps</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full rounded-lg" />
        )}
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
