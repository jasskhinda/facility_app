'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Test EXACT same dynamic import pattern as StreamlinedBookingForm
const SuperSimpleMap = dynamic(() => import('../components/SuperSimpleMap'), {
  ssr: false,
  loading: () => <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin h-6 w-6 border-2 border-gray-400 border-t-transparent rounded-full mx-auto mb-2"></div>
      <p className="text-gray-600 text-sm">Loading map...</p>
    </div>
  </div>
});

export default function ProductionSimulationPage() {
  const [formData, setFormData] = useState({
    pickupAddress: '',
    destinationAddress: ''
  });
  const [routeInfo, setRouteInfo] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [testResults, setTestResults] = useState([]);

  // Test scenarios that mirror real booking form usage
  const testScenarios = [
    {
      id: 'scenario1',
      name: 'Ohio State Hospital Route',
      pickup: '370 W 9th Ave, Columbus, OH 43210, USA',
      destination: '1234 E Broad St, Columbus, OH 43205, USA',
      description: 'Hospital to residential area'
    },
    {
      id: 'scenario2', 
      name: 'Facility to Medical Center',
      pickup: '5050 Blazer Pkwy #100, Dublin, OH 43017, USA',
      destination: '1650 Crocker Rd, Westerville, OH 43081, USA',
      description: 'Suburban facility to medical center'
    },
    {
      id: 'scenario3',
      name: 'Short Distance Test',
      pickup: '123 E Broad St, Columbus, OH 43215, USA',
      destination: '456 N High St, Columbus, OH 43215, USA',
      description: 'Short downtown route'
    }
  ];

  const handleTestScenario = (scenario) => {
    console.log('🧪 Testing scenario:', scenario.name);
    setFormData({
      pickupAddress: scenario.pickup,
      destinationAddress: scenario.destination
    });
    setShowMap(false);
    setRouteInfo(null);
    
    // Simulate user entering addresses and triggering map
    setTimeout(() => {
      setShowMap(true);
    }, 500);
  };

  const handleRouteCalculated = (info) => {
    console.log('✅ Route calculated successfully for test:', info);
    setRouteInfo(info);
    
    // Record test result
    const result = {
      timestamp: new Date().toLocaleTimeString(),
      pickup: formData.pickupAddress.substring(0, 30) + '...',
      destination: formData.destinationAddress.substring(0, 30) + '...',
      success: true,
      distance: info.distance.text,
      duration: info.duration.text
    };
    setTestResults(prev => [result, ...prev.slice(0, 4)]);
  };

  const simulateFormSubmission = () => {
    if (!routeInfo) {
      alert('Please calculate route first by entering addresses');
      return;
    }
    
    console.log('📋 Simulating booking form submission with route info:', routeInfo);
    alert(`✅ Form would submit with:\n- Distance: ${routeInfo.distance.text}\n- Duration: ${routeInfo.duration.text}\n- Miles: ${routeInfo.distance.miles}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚗 Production Booking Form Simulation
          </h1>
          <p className="text-gray-600">
            Testing SuperSimpleMap with exact production booking form implementation
          </p>
          <div className="mt-4 inline-flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${routeInfo ? 'bg-green-400' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Route Calculated</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${testResults.length > 0 ? 'bg-blue-400' : 'bg-gray-300'}`}></div>
              <span className="text-sm">Tests Completed: {testResults.length}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Booking Form Simulation */}
          <div className="space-y-6">
            {/* Test Scenarios */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">🧪 Test Scenarios</h2>
              <div className="space-y-3">
                {testScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => handleTestScenario(scenario)}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="font-medium text-blue-700">{scenario.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{scenario.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">📍 Address Form</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address</label>
                  <input
                    type="text"
                    value={formData.pickupAddress}
                    onChange={(e) => setFormData({...formData, pickupAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter pickup address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination Address</label>
                  <input
                    type="text"
                    value={formData.destinationAddress}
                    onChange={(e) => setFormData({...formData, destinationAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter destination address"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowMap(true)}
                    disabled={!formData.pickupAddress || !formData.destinationAddress}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Show Route Overview
                  </button>
                  <button
                    onClick={simulateFormSubmission}
                    disabled={!routeInfo}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Submit Booking
                  </button>
                </div>
              </div>
            </div>

            {/* Test Results History */}
            {testResults.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Test Results History</h3>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="text-sm bg-green-100 p-2 rounded">
                      <div className="font-medium text-green-800">
                        Test {testResults.length - index}: {result.timestamp}
                      </div>
                      <div className="text-green-700">
                        {result.pickup} → {result.destination}
                      </div>
                      <div className="text-green-600">
                        {result.distance} • {result.duration}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Map Display */}
          <div className="space-y-6">
            {/* Route Overview Section (exact like booking form) */}
            {formData.pickupAddress && formData.destinationAddress && showMap && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Route Overview
                </label>
                <SuperSimpleMap
                  origin={formData.pickupAddress}
                  destination={formData.destinationAddress}
                  onRouteCalculated={handleRouteCalculated}
                />
              </div>
            )}

            {/* Route Info Display */}
            {routeInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 Current Route Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{routeInfo.distance.text}</div>
                    <div className="text-sm text-blue-600">Distance ({routeInfo.distance.miles} miles)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-700">{routeInfo.duration.text}</div>
                    <div className="text-sm text-blue-600">Estimated time</div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">🔍 What This Tests</h3>
              <div className="space-y-2 text-yellow-700 text-sm">
                <p><strong>1.</strong> Exact same dynamic import pattern as production booking form</p>
                <p><strong>2.</strong> Same component props and state management</p>
                <p><strong>3.</strong> Same map initialization timing and error handling</p>
                <p><strong>4.</strong> Same route calculation callback pattern</p>
                <p><strong>5.</strong> Tests the "Map container not ready" fix in production context</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
