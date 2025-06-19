'use client';

import { useEffect, useState } from 'react';

export default function TestDebugMaps() {
  const [debugInfo, setDebugInfo] = useState({
    apiKey: 'checking...',
    googleMapsLoaded: false,
    globalCallbackFired: false,
    eventFired: false,
    windowObject: 'checking...'
  });

  useEffect(() => {
    // Check API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // Check if Google Maps is loaded
    const checkGoogleMaps = () => {
      return typeof window !== 'undefined' && window.google && window.google.maps;
    };

    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'NOT SET',
      googleMapsLoaded: checkGoogleMaps(),
      windowObject: typeof window
    }));

    // Listen for global callback
    const handleGlobalCallback = () => {
      console.log('Debug: Global callback detected');
      setDebugInfo(prev => ({
        ...prev,
        globalCallbackFired: true
      }));
    };

    // Listen for custom event
    const handleCustomEvent = () => {
      console.log('Debug: Custom event detected');
      setDebugInfo(prev => ({
        ...prev,
        eventFired: true,
        googleMapsLoaded: checkGoogleMaps()
      }));
    };

    // Set up listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('googleMapsReady', handleCustomEvent);
      
      // Check if callback function exists
      if (window.initGoogleMapsGlobal) {
        console.log('Debug: Global callback function exists');
      }

      // Periodic check for Google Maps
      const interval = setInterval(() => {
        if (checkGoogleMaps()) {
          setDebugInfo(prev => ({
            ...prev,
            googleMapsLoaded: true
          }));
          clearInterval(interval);
        }
      }, 500);

      return () => {
        window.removeEventListener('googleMapsReady', handleCustomEvent);
        clearInterval(interval);
      };
    }
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Google Maps Debug Information</h1>
      
      <div className="bg-gray-50 p-6 rounded-lg space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>API Key:</strong>
            <span className={`ml-2 ${debugInfo.apiKey.includes('NOT SET') ? 'text-red-600' : 'text-green-600'}`}>
              {debugInfo.apiKey}
            </span>
          </div>
          
          <div>
            <strong>Window Type:</strong>
            <span className="ml-2">{debugInfo.windowObject}</span>
          </div>
          
          <div>
            <strong>Google Maps Loaded:</strong>
            <span className={`ml-2 ${debugInfo.googleMapsLoaded ? 'text-green-600' : 'text-red-600'}`}>
              {debugInfo.googleMapsLoaded ? 'YES' : 'NO'}
            </span>
          </div>
          
          <div>
            <strong>Global Callback Fired:</strong>
            <span className={`ml-2 ${debugInfo.globalCallbackFired ? 'text-green-600' : 'text-orange-600'}`}>
              {debugInfo.globalCallbackFired ? 'YES' : 'NO'}
            </span>
          </div>
          
          <div>
            <strong>Custom Event Fired:</strong>
            <span className={`ml-2 ${debugInfo.eventFired ? 'text-green-600' : 'text-orange-600'}`}>
              {debugInfo.eventFired ? 'YES' : 'NO'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Console Output</h2>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm">
          <div>Check the browser console for detailed logging</div>
          <div>Look for messages starting with "🗺️" and "Debug:"</div>
        </div>
      </div>

      <div className="mt-6">
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
