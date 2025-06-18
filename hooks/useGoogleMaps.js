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
    // Return early if not in browser
    if (typeof window === 'undefined') {
      return;
    }

    console.log('useGoogleMaps hook called with libraries:', libraries);
    
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      console.log('Google Maps already loaded');
      setIsLoaded(true);
      return;
    }

    // Get API key from environment
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log('API Key exists:', !!apiKey, apiKey ? `(${apiKey.substring(0, 8)}...)` : 'None');
    
    if (!apiKey) {
      const error = new Error('Google Maps API key is missing');
      console.error('Missing API key');
      setLoadError(error);
      return;
    }

    // Check if we're already in the process of loading
    if (window.googleMapsLoadPromise) {
      console.log('Google Maps already loading, waiting for promise...');
      window.googleMapsLoadPromise
        .then(() => {
          console.log('Google Maps loaded via existing promise');
          setIsLoaded(true);
        })
        .catch((error) => {
          console.error('Google Maps loading failed via existing promise:', error);
          setLoadError(error);
        });
      return;
    }

    // Check for existing script
    const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api"]`);
    if (existingScript) {
      console.log('Existing Google Maps script found, waiting for it to load...');
      // Wait for existing script to load
      const checkGoogleInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          console.log('Google Maps loaded via existing script');
          clearInterval(checkGoogleInterval);
          setIsLoaded(true);
        }
      }, 100);
      
      // Clear interval after 15 seconds to avoid infinite checking
      setTimeout(() => {
        clearInterval(checkGoogleInterval);
        if (!isLoaded) {
          console.error('Timeout waiting for existing Google Maps script');
          setLoadError(new Error('Timeout waiting for Google Maps to load'));
        }
      }, 15000);
      return;
    }

    // Create a promise to track loading
    window.googleMapsLoadPromise = new Promise((resolve, reject) => {
      // Create callback for script
      const callbackName = 'initGoogleMaps';
      window[callbackName] = () => {
        console.log('Google Maps callback fired');
        if (window.google && window.google.maps) {
          console.log('Google Maps successfully loaded');
          setIsLoaded(true);
          resolve(window.google.maps);
          delete window[callbackName];
        } else {
          const error = new Error('Google Maps failed to load properly');
          console.error('Google Maps callback fired but API not available');
          setLoadError(error);
          reject(error);
        }
      };

      // Create script element
      const librariesParam = libraries.join(',');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${librariesParam}&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      console.log('Loading Google Maps script:', script.src);
      
      script.onerror = (error) => {
        console.error('Google Maps script loading error:', error);
        setLoadError(new Error('Failed to load Google Maps script'));
        reject(error);
      };
      
      document.head.appendChild(script);
    });

    // Handle the loading promise
    window.googleMapsLoadPromise
      .then(() => {
        console.log('Google Maps promise resolved');
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Google Maps promise rejected:', error);
        setLoadError(error);
      });

  }, [libraries.join(',')]); // Depend on libraries as a string to avoid unnecessary re-renders

  return { isLoaded, loadError };
}
