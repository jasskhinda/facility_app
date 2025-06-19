'use client';

import { useEffect, useState } from 'react';

export default function GoogleMapsDebug() {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = {
        timestamp: new Date().toLocaleTimeString(),
        windowGoogle: typeof window !== 'undefined' && !!window.google,
        windowGoogleMaps: typeof window !== 'undefined' && !!window.google && !!window.google.maps,
        windowGoogleMapsPlaces: typeof window !== 'undefined' && !!window.google && !!window.google.maps && !!window.google.maps.places,
        apiKey: typeof window !== 'undefined' && !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
        apiKeyPreview: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 10) + '...' : 'Not found',
        scriptsFound: typeof window !== 'undefined' ? document.querySelectorAll('script[src*="maps.googleapis.com"]').length : 0,
        globalCallbacks: typeof window !== 'undefined' ? Object.keys(window).filter(key => key.includes('Google') || key.includes('Maps') || key.includes('init')).slice(0, 5) : []
      };
      setDebugInfo(info);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-xs font-mono">
      <h3 className="font-bold mb-2">Google Maps Debug Info</h3>
      <div className="space-y-1">
        <div>⏰ Time: {debugInfo.timestamp}</div>
        <div>🌐 window.google: {debugInfo.windowGoogle ? '✅' : '❌'}</div>
        <div>🗺️ window.google.maps: {debugInfo.windowGoogleMaps ? '✅' : '❌'}</div>
        <div>📍 window.google.maps.places: {debugInfo.windowGoogleMapsPlaces ? '✅' : '❌'}</div>
        <div>🔑 API Key: {debugInfo.apiKey ? '✅' : '❌'} ({debugInfo.apiKeyPreview})</div>
        <div>📜 Scripts: {debugInfo.scriptsFound} found</div>
        <div>🔧 Callbacks: {debugInfo.globalCallbacks.join(', ') || 'None'}</div>
      </div>
    </div>
  );
}
