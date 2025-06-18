'use client';

import { useEffect, useRef, useState } from 'react';

export default function AddressAutocompleteSimple({
  value,
  onChange,
  placeholder,
  className,
  required = false
}) {
  const inputRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('AddressAutocompleteSimple: Starting initialization');
    
    const initializeAutocomplete = () => {
      if (!inputRef.current) {
        console.log('Input ref not available');
        return;
      }

      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.log('Google Maps Places API not available');
        return;
      }

      try {
        console.log('Creating autocomplete instance');
        const options = {
          componentRestrictions: { country: 'us' },
          fields: ['formatted_address', 'geometry'],
          types: ['address']
        };

        const autocompleteInstance = new window.google.maps.places.Autocomplete(
          inputRef.current,
          options
        );

        autocompleteInstance.addListener('place_changed', () => {
          const place = autocompleteInstance.getPlace();
          console.log('Place changed:', place);
          
          if (place && place.formatted_address) {
            console.log('Setting address:', place.formatted_address);
            onChange(place.formatted_address);
          }
        });

        setAutocomplete(autocompleteInstance);
        setIsLoading(false);
        setError('');
        console.log('Autocomplete initialized successfully');

      } catch (err) {
        console.error('Error initializing autocomplete:', err);
        setError('Failed to initialize address suggestions');
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
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('Google Maps already loaded');
        initializeAutocomplete();
        return;
      }

      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('Google Maps script already exists, waiting for load...');
        const checkInterval = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(checkInterval);
            initializeAutocomplete();
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          if (!autocomplete) {
            setError('Timeout waiting for Google Maps to load');
            setIsLoading(false);
          }
        }, 10000);
        return;
      }

      console.log('Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsAutocomplete`;
      script.async = true;
      script.defer = true;
      
      // Create a global callback for when the script loads
      window.initGoogleMapsAutocomplete = () => {
        console.log('Google Maps callback fired for autocomplete');
        setTimeout(initializeAutocomplete, 100);
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

    return () => {
      if (autocomplete && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled={isLoading}
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
