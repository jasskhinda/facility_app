'use client';

import { useEffect, useRef, useState } from 'react';
import useGoogleMaps from '@/hooks/useGoogleMaps';

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  required = false
}) {
  const inputRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const { isLoaded: mapsLoaded, loadError } = useGoogleMaps(['places']);
  const [error, setError] = useState('');

  // Initialize autocomplete when Google Maps Places API is loaded
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps loading error:', loadError);
      setError('Failed to load address suggestions: ' + loadError.message);
      return;
    }
    
    if (!mapsLoaded || !inputRef.current) {
      return;
    }

    try {
      console.log('Initializing address autocomplete');
      const options = {
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
      };

      const autocompleteInstance = new window.google.maps.places.Autocomplete(
        inputRef.current,
        options
      );

      autocompleteInstance.addListener('place_changed', () => {
        const place = autocompleteInstance.getPlace();
        if (!place.formatted_address) {
          console.warn('Place selection did not return a formatted address');
          return;
        }
        
        console.log('Place selected:', place.formatted_address);
        onChange(place.formatted_address);
      });

      setAutocomplete(autocompleteInstance);
      setError('');

      // Clean up autocomplete when component unmounts
      return () => {
        if (autocompleteInstance) {
          window.google.maps.event.clearInstanceListeners(autocompleteInstance);
        }
      };
    } catch (err) {
      console.error('Error initializing autocomplete:', err);
      setError('Failed to initialize address suggestions');
    }
  }, [mapsLoaded, loadError, onChange]);

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
      />
      {error && (
        <p className="text-xs text-red-500 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}