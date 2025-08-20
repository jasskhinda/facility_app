'use client';

import { useEffect, useRef, useState } from 'react';

export default function RouteMapDisplaySimple({ 
  origin, 
  destination, 
  onRouteCalculated = null,
  className = "w-full h-64 rounded-lg border border-gray-200"
}) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('RouteMapDisplaySimple: Starting initialization');
    
    const initializeMap = () => {
      if (!mapRef.current) {
        console.log('Map ref not available');
        return;
      }

      if (!window.google || !window.google.maps) {
        console.log('Google Maps API not available');
        return;
      }

      try {
        console.log('Creating map instance');
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: 39.9612, lng: -82.9988 }, // Columbus, OH
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const service = new window.google.maps.DirectionsService();
        const renderer = new window.google.maps.DirectionsRenderer({
          draggable: false,
          polylineOptions: {
            strokeColor: '#7CCFD0',
            strokeWeight: 4,
            strokeOpacity: 0.8,
          },
        });

        renderer.setMap(mapInstance);

        setMap(mapInstance);
        setDirectionsService(service);
        setDirectionsRenderer(renderer);
        setIsLoading(false);
        setError('');
        console.log('Map initialized successfully');

      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map');
        setIsLoading(false);
      }
    };

    const loadGoogleMaps = () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key is missing');
        setError('Google Maps API key is not configured');
        setIsLoading(false);
        return;
      }

      // Check if already loaded
      if (window.google && window.google.maps) {
        console.log('Google Maps already loaded');
        initializeMap();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already exists, waiting for load...');
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkInterval);
            initializeMap();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (!map) {
            setError('Timeout waiting for Google Maps to load');
            setIsLoading(false);
          }
        }, 10000);
        return;
      }

      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsMap`;
      script.async = true;
      script.defer = true;
      
      // Create a global callback for when the script loads
      window.initGoogleMapsMap = () => {
        console.log('Google Maps callback fired for map');
        setTimeout(initializeMap, 100);
      };
      
      script.onload = () => {
        console.log('Google Maps script loaded');
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        setError('Failed to load Google Maps');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // Calculate route when addresses change
  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) {
      return;
    }

    console.log('Calculating route from', origin, 'to', destination);
    calculateRoute();
  }, [origin, destination, directionsService, directionsRenderer]);

  const calculateRoute = () => {
    if (!directionsService || !directionsRenderer) {
      console.log('Directions service or renderer not available');
      return;
    }

    const request = {
      origin: origin,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.IMPERIAL,
      provideRouteAlternatives: true, // Request alternative routes
      optimizeWaypoints: false,
      avoidHighways: false,
      avoidTolls: false,
    };

    console.log('Making directions request:', request);

    directionsService.route(request, (result, status) => {
      console.log('Directions response:', status, result);
      
      if (status === 'OK' && result && result.routes && result.routes.length > 0) {
        console.log(`RouteMapDisplaySimple: Found ${result.routes.length} routes`);
        
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
        
        console.log('RouteMapDisplaySimple: Selected fastest route (shortest duration)');
        directionsRenderer.setDirections({...result, routes: [fastestRoute]});
        
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
          endAddress: leg.end_address,
          distanceText: leg.distance.text,
          durationText: leg.duration.text
        };
        
        setRouteInfo(routeData);
        console.log('Route calculated successfully:', routeData);
        
        if (onRouteCalculated) {
          onRouteCalculated(routeData);
        }
      } else {
        console.error('Directions request failed:', status);
        setError('Unable to calculate route between addresses');
        setRouteInfo(null);
        if (onRouteCalculated) {
          onRouteCalculated(null);
        }
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className={className}>
        {error ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 15.5C3.498 16.333 4.46 18 6 18z" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full rounded-lg" />
        )}
      </div>

      {routeInfo && (
        <div className="bg-[#7CCFD0]/10 dark:bg-[#7CCFD0]/20 border border-[#7CCFD0]/20 dark:border-[#7CCFD0]/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-[#2E4F54] text-gray-900">
                <span className="font-medium">{routeInfo.distance.text}</span>
                <span className="text-[#2E4F54]/60 text-gray-900/60 ml-1">
                  ({routeInfo.distance.miles} miles)
                </span>
              </div>
              
              <div className="flex items-center text-sm text-[#2E4F54] text-gray-900">
                <span className="font-medium">{routeInfo.duration.text}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
