'use client';

import { useEffect, useRef, useState } from 'react';

export default function SimpleMap({ 
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
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    console.log('SimpleMap: Starting initialization');
    
    const initializeMap = () => {
      if (typeof window === 'undefined' || !mapRef.current) {
        console.log('Window or map ref not available');
        return;
      }

      if (!window.google || !window.google.maps) {
        console.log('Google Maps API not available');
        return;
      }

      try {
        console.log('Creating map instance...');
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: 39.9612, lng: -82.9988 }, // Columbus, OH
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const service = new window.google.maps.DirectionsService();
        const renderer = new window.google.maps.DirectionsRenderer({
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
        setIsReady(true);
        setError('');
        console.log('Map initialized successfully');

      } catch (err) {
        console.error('Error initializing map:', err);
        setError('Failed to initialize map');
      }
    };

    const loadGoogleMaps = () => {
      if (typeof window === 'undefined') {
        console.log('Window not available (SSR)');
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      if (!apiKey) {
        console.error('Google Maps API key is missing');
        setError('Google Maps API key is not configured');
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
      if (typeof window !== 'undefined') {
        window.initGoogleMapsMap = () => {
          console.log('Google Maps callback fired for map');
          setTimeout(initializeMap, 100);
        };
      }
      
      script.onload = () => {
        console.log('Google Maps script loaded');
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        setError('Failed to load Google Maps');
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMaps();

    return () => {
      if (window.initGoogleMapsMap) {
        delete window.initGoogleMapsMap;
      }
    };
  }, [mounted]);

  useEffect(() => {
    if (!isReady || !directionsService || !directionsRenderer || !origin || !destination) {
      return;
    }

    console.log('Calculating route:', origin, 'to', destination);
    
    const request = {
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      unitSystem: window.google.maps.UnitSystem.IMPERIAL
    };

    directionsService.route(request, (result, status) => {
      console.log('Route result:', status);
      
      if (status === 'OK' && result) {
        directionsRenderer.setDirections(result);
        
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
        console.log('Route calculated:', routeData);
        
        if (onRouteCalculated) {
          onRouteCalculated(routeData);
        }
      } else {
        console.error('Route calculation failed:', status);
        setError('Unable to calculate route');
      }
    });
  }, [origin, destination, isReady, directionsService, directionsRenderer, onRouteCalculated]);

  if (!mounted) {
    return (
      <div className="space-y-3">
        <div className={className}>
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-pulse h-8 w-8 bg-gray-300 rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={className}>
        {error ? (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
        ) : !isReady ? (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full rounded-lg" />
        )}
      </div>

      {routeInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="font-medium">{routeInfo.distance.text}</span>
              <span className="text-gray-600 ml-1">({routeInfo.distance.miles} miles)</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">{routeInfo.duration.text}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
