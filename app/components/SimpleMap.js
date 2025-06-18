'use client';

import { useEffect, useRef, useState } from 'react';
import { waitForGoogleMaps } from '@/lib/google-maps-loader';

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

  useEffect(() => {
    console.log('SimpleMap: useEffect called');
    
    const initMap = async () => {
      try {
        console.log('Waiting for Google Maps...');
        await waitForGoogleMaps();
        
        if (!mapRef.current) {
          console.log('Map ref not available');
          return;
        }

        console.log('Creating map...');
        const mapInstance = new window.google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: 39.9612, lng: -82.9988 } // Columbus, OH
        });

        const service = new window.google.maps.DirectionsService();
        const renderer = new window.google.maps.DirectionsRenderer({
          polylineOptions: {
            strokeColor: '#7CCFD0',
            strokeWeight: 4
          }
        });

        renderer.setMap(mapInstance);

        setMap(mapInstance);
        setDirectionsService(service);
        setDirectionsRenderer(renderer);
        setIsReady(true);
        setError('');
        console.log('Map ready');

      } catch (err) {
        console.error('Error setting up map:', err);
        setError('Failed to initialize map');
      }
    };

    initMap();
  }, []);

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
