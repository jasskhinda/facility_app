'use client';

import { useEffect, useRef, useState } from 'react';

export default function RouteMapDisplay({ 
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');

  // Initialize map when Google Maps loads
  useEffect(() => {
    const initializeMap = () => {
      if (!window.google || !mapRef.current) {
        console.log('Google Maps API or map reference not available');
        return;
      }

      try {
        console.log('Initializing Google Maps');
        // Create map
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: 39.9612, lng: -82.9988 }, // Columbus, OH center
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // Create directions service and renderer
        const service = new window.google.maps.DirectionsService();
        const renderer = new window.google.maps.DirectionsRenderer({
          draggable: false,
          panel: null,
          polylineOptions: {
            strokeColor: '#7CCFD0',
            strokeWeight: 4,
            strokeOpacity: 0.8,
          },
          markerOptions: {
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#7CCFD0',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
          },
        });

        renderer.setMap(mapInstance);

        setMap(mapInstance);
        setDirectionsService(service);
        setDirectionsRenderer(renderer);
        setIsLoaded(true);
        setError('');
      } catch (err) {
        console.error('Map initialization error:', err);
        setError('Failed to initialize map');
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      // Load Google Maps script
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key is missing');
        setError('Google Maps API key is not configured');
        return;
      }
      
      console.log('Loading Google Maps API with key:', apiKey ? 'Key exists' : 'No key');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = () => {
        console.log('Google Maps script loaded successfully');
        initializeMap();
      };
      script.onerror = () => {
        setError('Failed to load Google Maps');
      };
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  // Calculate route when addresses change
  useEffect(() => {
    if (!isLoaded || !directionsService || !directionsRenderer || !origin || !destination) {
      return;
    }

    calculateRoute();
  }, [origin, destination, isLoaded, directionsService, directionsRenderer]);

  const calculateRoute = async () => {
    if (!directionsService || !directionsRenderer) return;

    try {
      setError('');
      
      const request = {
        origin: origin,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false,
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);
          
          // Extract route information
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
            endAddress: leg.end_address,
            // Add these properties at the top level for easier access
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
    } catch (err) {
      console.error('Route calculation error:', err);
      setError('Error calculating route');
      setRouteInfo(null);
      if (onRouteCalculated) {
        onRouteCalculated(null);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Map Container */}
      <div className={className}>
        {error ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          </div>
        ) : !isLoaded ? (
          <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-[#7CCFD0] mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full rounded-lg" />
        )}
      </div>

      {/* Route Information */}
      {routeInfo && (
        <div className="bg-[#7CCFD0]/10 dark:bg-[#7CCFD0]/20 border border-[#7CCFD0]/20 dark:border-[#7CCFD0]/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                <svg className="w-4 h-4 text-[#7CCFD0] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-medium">{routeInfo.distance.text}</span>
                <span className="text-[#2E4F54]/60 dark:text-[#E0F4F5]/60 ml-1">
                  ({routeInfo.distance.miles} miles)
                </span>
              </div>
              
              <div className="flex items-center text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                <svg className="w-4 h-4 text-[#7CCFD0] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{routeInfo.duration.text}</span>
              </div>
            </div>
            
            <div className="text-xs text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
              Driving route
            </div>
          </div>
          
          {/* Route addresses */}
          <div className="mt-3 space-y-1 text-xs text-[#2E4F54]/80 dark:text-[#E0F4F5]/80">
            <div className="flex items-start">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1 mr-2 flex-shrink-0"></span>
              <span className="flex-1">{routeInfo.startAddress}</span>
            </div>
            <div className="flex items-start">
              <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-1 mr-2 flex-shrink-0"></span>
              <span className="flex-1">{routeInfo.endAddress}</span>
            </div>
          </div>
        </div>
      )}

      {/* No route message */}
      {isLoaded && !routeInfo && !error && (origin || destination) && (
        <div className="text-center py-4">
          <p className="text-sm text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
            {!origin || !destination 
              ? 'Enter both pickup and destination addresses to see route'
              : 'Calculating route...'
            }
          </p>
        </div>
      )}
    </div>
  );
}
