'use client';

import { useEffect, useRef, useState } from 'react';

export default function MinimalMap({ 
  origin = "123 Main St, Columbus, OH", 
  destination = "456 Oak Ave, Columbus, OH",
  className = "w-full h-64 rounded-lg border border-gray-200"
}) {
  const mapRef = useRef(null);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('MinimalMap: Component mounted');
    setStatus('checking_google_maps');

    if (typeof window === 'undefined') {
      setError('Window not available');
      return;
    }

    const initMap = () => {
      console.log('MinimalMap: Attempting to init map');
      setStatus('initializing_map');

      if (!mapRef.current) {
        console.log('MinimalMap: Map container not ready, retrying...');
        setTimeout(() => {
          if (mapRef.current) {
            initMap();
          } else {
            setError('Map container failed to initialize');
          }
        }, 100);
        return;
      }

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 13,
          center: { lat: 39.9612, lng: -82.9988 },
        });

        const directionsService = new window.google.maps.DirectionsService();
        const directionsRenderer = new window.google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);

        directionsService.route({
          origin: origin,
          destination: destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: true, // Request alternative routes
          optimizeWaypoints: false,
          avoidHighways: false,
          avoidTolls: false
        }, (result, status) => {
          if (status === 'OK' && result && result.routes && result.routes.length > 0) {
            console.log(`MinimalMap: Found ${result.routes.length} routes`);
            
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
            
            console.log('MinimalMap: Selected fastest route (shortest duration)');
            directionsRenderer.setDirections({...result, routes: [fastestRoute]});
            setStatus('complete');
          } else {
            setError(`Route calculation failed: ${status}`);
          }
        });

      } catch (err) {
        console.error('MinimalMap: Error:', err);
        setError(`Map error: ${err.message}`);
      }
    };

    // Check if Google Maps is available
    if (window.google && window.google.maps) {
      console.log('MinimalMap: Google Maps already available');
      setTimeout(initMap, 50); // Small delay to ensure DOM is ready
    } else {
      console.log('MinimalMap: Waiting for Google Maps...');
      setStatus('waiting_for_google_maps');

      const checkForMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          console.log('MinimalMap: Google Maps now available');
          clearInterval(checkForMaps);
          setTimeout(initMap, 50);
        }
      }, 100);

      // Cleanup
      return () => {
        clearInterval(checkForMaps);
      };
    }

  }, [origin, destination]);

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full bg-red-50">
          <div className="text-center p-4">
            <p className="text-red-600 mb-2">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={className}>
        <div ref={mapRef} className="w-full h-full rounded-lg" />
      </div>
      <div className="text-sm text-gray-600">
        Status: {status}
      </div>
    </div>
  );
}
