# Google Maps Integration - Complete Troubleshooting Guide

## Overview
This document provides comprehensive troubleshooting steps for Google Maps integration issues in the Compassionate Rides Facility App.

## Common Issues and Solutions

### 1. Map Stuck at "Loading map..."

**Possible Causes:**
- Google Maps API key not properly loaded
- Script loading conflict
- DOM reference issues

**Solutions:**
1. Verify API key in `.env.local` is correctly configured
2. Check browser console for specific error messages
3. Clear browser cache and reload
4. Check that Google Maps libraries are fully loaded

### 2. Address Autocomplete Not Working

**Possible Causes:**
- Places library not included in Google Maps script
- Incorrect configuration of Autocomplete component
- DOM reference issues with input elements

**Solutions:**
1. Ensure script includes `libraries=places` parameter
2. Check browser console for "places is not defined" errors
3. Verify AddressAutocomplete component is properly implemented
4. Try with a simple input to isolate the issue

### 3. Route Calculation Failures

**Possible Causes:**
- Invalid addresses
- Google Maps API usage limits exceeded
- Network connectivity issues

**Solutions:**
1. Use complete, valid addresses (with city, state)
2. Check browser console for specific error codes
3. Verify network connectivity
4. Implement fallback distance estimation

## Debugging Steps

### Step 1: Verify Environment Variables
```bash
# Check if the API key is correctly set
cat .env.local | grep GOOGLE_MAPS
```

### Step 2: Browser Console Checks
Look for these specific errors:
- `Google is not defined`
- `google.maps is not defined`
- `google.maps.places is not defined`
- Any error containing "MapsApiError"

### Step 3: Component Testing
Test components individually:
1. Test AddressAutocomplete in isolation
2. Test RouteMapDisplay with hardcoded addresses
3. Test the full booking form flow

### Step 4: API Key Validation
Verify API key has these permissions enabled:
- Maps JavaScript API
- Places API
- Directions API
- Geocoding API

## Additional Debug Tools

### Component Status Check
```javascript
// Add to RouteMapDisplay component
console.log('Map Status:', {
  googleLoaded: !!window.google,
  mapsLoaded: !!(window.google && window.google.maps),
  placesLoaded: !!(window.google && window.google.maps && window.google.maps.places),
  mapRef: !!mapRef.current,
  directionsService: !!directionsService,
  directionsRenderer: !!directionsRenderer
});
```

### Route Calculation Debug
```javascript
// Add to calculateRoute function
console.log('Route calculation parameters:', {
  origin,
  destination,
  travelMode: 'DRIVING'
});
```

## Verification Steps

To verify the Google Maps integration is working properly:

1. Open the `/test-map` page
2. Enter valid addresses in both fields
3. Confirm address suggestions appear
4. Verify the map displays with route
5. Check route information JSON display
6. Test the booking form with the same addresses
