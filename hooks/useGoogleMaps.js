'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for loading Google Maps API
 * 
 * This hook provides consistent Google Maps API loading across components
 * and prevents duplicate script loading.
 * 
 * @param {Array} libraries - Google Maps libraries to load (e.g., ['places', 'geometry'])
 * @returns {Object} - Google Maps loading status
 */
export default function useGoogleMaps(libraries = ['places']) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    // Define a global loading promise to prevent multiple load attempts
    if (!window.googleMapsLoadPromise) {
      window.googleMapsLoadPromise = new Promise((resolve, reject) => {
        // Check if Google Maps is already loaded
        if (window.google && window.google.maps) {
          setIsLoaded(true);
          resolve(window.google.maps);
          return;
        }

        // Get API key from environment
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          const error = new Error('Google Maps API key is missing');
          setLoadError(error);
          reject(error);
          return;
        }

        // Create callback for script
        const callbackName = `googleMapsInitCallback_${Date.now()}`;
        window[callbackName] = () => {
          if (window.google && window.google.maps) {
            setIsLoaded(true);
            resolve(window.google.maps);
            delete window[callbackName];
          } else {
            const error = new Error('Google Maps failed to load');
            setLoadError(error);
            reject(error);
          }
        };

        // Check for existing script
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api"]`);
        if (existingScript) {
          // Wait for existing script to load
          const checkGoogleInterval = setInterval(() => {
            if (window.google && window.google.maps) {
              clearInterval(checkGoogleInterval);
              window[callbackName]();
            }
          }, 100);
          
          // Clear interval after 10 seconds to avoid infinite checking
          setTimeout(() => clearInterval(checkGoogleInterval), 10000);
          return;
        }

        // Create script element
        const librariesParam = libraries.join(',');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${librariesParam}&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        
        script.onerror = (error) => {
          setLoadError(error);
          reject(error);
        };
        
        document.head.appendChild(script);
      });
    }

    // Handle the loading promise
    window.googleMapsLoadPromise
      .then(() => setIsLoaded(true))
      .catch((error) => setLoadError(error));

    return () => {
      // Cleanup callback if component unmounts before loading completes
      if (window.googleMapsLoadPromise && !isLoaded) {
        const callbackName = Object.keys(window).find(key => key.startsWith('googleMapsInitCallback_'));
        if (callbackName) delete window[callbackName];
      }
    };
  }, [libraries]);

  return { isLoaded, loadError };
}
