'use client';

import { useEffect, useState } from 'react';

export default function SimpleGoogleMapsTest() {
  const [status, setStatus] = useState('Initializing...');
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(message);
  };

  useEffect(() => {
    addLog('🚀 Starting simple Google Maps test');

    // Test if the API key is accessible
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setStatus('❌ API Key Missing');
      addLog('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found');
      return;
    }
    
    addLog(`✅ API Key found: ${apiKey.substring(0, 10)}...`);

    // Check if Google Maps script is in the DOM
    const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    addLog(`📄 Found ${scripts.length} Google Maps scripts in DOM`);
    
    scripts.forEach((script, index) => {
      addLog(`Script ${index + 1}: ${script.src}`);
    });

    // Check window.google periodically
    let checkCount = 0;
    const maxChecks = 30; // 15 seconds
    
    const checkGoogleMaps = () => {
      checkCount++;
      addLog(`🔍 Check ${checkCount}: Looking for window.google...`);
      
      if (window.google) {
        addLog('✅ window.google found!');
        
        if (window.google.maps) {
          addLog('✅ window.google.maps found!');
          setStatus('✅ Google Maps API Ready');
          
          // Test creating a simple service
          try {
            const geocoder = new window.google.maps.Geocoder();
            addLog('✅ Geocoder service created successfully');
            setStatus('✅ Google Maps Fully Functional');
          } catch (error) {
            addLog(`❌ Error creating geocoder: ${error.message}`);
            setStatus('⚠️ Google Maps Partially Working');
          }
          
          return; // Stop checking
        } else {
          addLog('⚠️ window.google exists but google.maps is undefined');
        }
      } else {
        addLog('❌ window.google is undefined');
      }
      
      if (checkCount < maxChecks) {
        setTimeout(checkGoogleMaps, 500);
      } else {
        addLog('❌ Timeout: Google Maps never loaded');
        setStatus('❌ Google Maps Failed to Load');
      }
    };

    // Start checking after a brief delay
    setTimeout(checkGoogleMaps, 1000);

  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Simple Google Maps Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <h2 className="text-xl font-semibold">Status:</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              status.includes('✅') ? 'bg-green-100 text-green-800' :
              status.includes('⚠️') ? 'bg-yellow-100 text-yellow-800' :
              status.includes('❌') ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {status}
            </span>
          </div>
          
          <div className="space-y-2">
            <div>
              <strong>API Key:</strong> {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 
                `${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.substring(0, 15)}...` : 
                'Not found'}
            </div>
            <div>
              <strong>Environment:</strong> {typeof window !== 'undefined' ? 'Client' : 'Server'}
            </div>
            <div>
              <strong>Google Object:</strong> {typeof window !== 'undefined' && window.google ? 'Available' : 'Not available'}
            </div>
            <div>
              <strong>Maps Object:</strong> {typeof window !== 'undefined' && window.google?.maps ? 'Available' : 'Not available'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Log</h2>
          <div className="bg-gray-900 text-green-400 rounded p-4 h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">🎯 What This Tests</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• API key availability and format</li>
            <li>• Google Maps script loading in DOM</li>
            <li>• window.google object availability</li>
            <li>• window.google.maps object availability</li>
            <li>• Basic API functionality (Geocoder creation)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
