'use client';

import { useEffect, useState } from 'react';

export default function GoogleMapsDebugPage() {
  const [status, setStatus] = useState('Checking...');
  const [details, setDetails] = useState([]);

  useEffect(() => {
    const log = (message) => {
      console.log(message);
      setDetails(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    log('🔍 Starting Google Maps debug...');

    // Check if running in browser
    if (typeof window === 'undefined') {
      setStatus('❌ Not in browser environment');
      return;
    }

    log('✅ Browser environment detected');

    // Check initial Google Maps availability
    if (window.google && window.google.maps) {
      log('✅ Google Maps already loaded');
      setStatus('✅ Google Maps is available');
      return;
    }

    log('⏳ Google Maps not yet loaded, waiting...');
    setStatus('⏳ Waiting for Google Maps...');

    // Check for Google Maps loading every 500ms for up to 30 seconds
    let attempts = 0;
    const maxAttempts = 60; // 30 seconds

    const checkInterval = setInterval(() => {
      attempts++;
      log(`Attempt ${attempts}: Checking for Google Maps...`);

      if (window.google && window.google.maps) {
        log('✅ Google Maps successfully loaded!');
        setStatus('✅ Google Maps loaded successfully');
        clearInterval(checkInterval);
        
        // Test basic API functionality
        try {
          const geocoder = new window.google.maps.Geocoder();
          log('✅ Geocoder service created successfully');
          
          const directionsService = new window.google.maps.DirectionsService();
          log('✅ Directions service created successfully');
          
          setStatus('✅ Google Maps fully functional');
        } catch (error) {
          log(`❌ Error testing Google Maps APIs: ${error.message}`);
          setStatus('❌ Google Maps loaded but APIs failed');
        }
        return;
      }

      if (attempts >= maxAttempts) {
        log('❌ Timeout: Google Maps failed to load after 30 seconds');
        setStatus('❌ Timeout waiting for Google Maps');
        clearInterval(checkInterval);
      }
    }, 500);

    // Also listen for the custom event
    const handleGoogleMapsReady = () => {
      log('📡 Custom googleMapsReady event received');
      if (window.google && window.google.maps) {
        log('✅ Google Maps confirmed via custom event');
        setStatus('✅ Google Maps ready via custom event');
        clearInterval(checkInterval);
      }
    };

    window.addEventListener('googleMapsReady', handleGoogleMapsReady);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('googleMapsReady', handleGoogleMapsReady);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🗺️ Google Maps Debug Tool</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <div className="text-2xl mb-4">{status}</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Environment Check</h3>
              <div className="space-y-1 text-sm">
                <div>Window: {typeof window !== 'undefined' ? '✅' : '❌'}</div>
                <div>Google: {typeof window !== 'undefined' && window.google ? '✅' : '❌'}</div>
                <div>Maps: {typeof window !== 'undefined' && window.google?.maps ? '✅' : '❌'}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">API Key Check</h3>
              <div className="text-sm">
                <div>API Key: {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing'}</div>
                <div className="text-xs text-gray-600 mt-1 break-all">
                  {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 
                    `${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 20)}...` : 
                    'No API key found'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
          <div className="bg-gray-100 rounded p-4 h-64 overflow-y-auto">
            {details.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              <div className="space-y-1">
                {details.map((detail, index) => (
                  <div key={index} className="text-sm font-mono text-gray-700">
                    {detail}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Expected Behavior</h3>
          <p className="text-blue-700 text-sm">
            Google Maps should load within a few seconds. If it shows "Timeout waiting for Google Maps", 
            there may be an issue with the API key, network connectivity, or the Google Maps script loading.
          </p>
        </div>
      </div>
    </div>
  );
}
