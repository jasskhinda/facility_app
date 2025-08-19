'use client';

import { useState } from 'react';
import { calculateTripPrice, formatCurrency, createPricingBreakdown, PRICING_CONFIG } from '@/lib/pricing';

export default function PricingTestPage() {
  const [testData, setTestData] = useState({
    isRoundTrip: false,
    distance: 10,
    pickupDateTime: '2024-12-19T14:30',
    wheelchairType: 'no_wheelchair',
    clientType: 'facility',
    additionalPassengers: 0
  });

  const [pricing, setPricing] = useState(null);

  const calculateTest = () => {
    const result = calculateTripPrice(testData);
    setPricing(result);
  };

  const testScenarios = [
    {
      name: 'Basic One-Way Trip',
      data: { isRoundTrip: false, distance: 5, pickupDateTime: '2024-12-19T14:30', wheelchairType: 'no_wheelchair', clientType: 'facility' }
    },
    {
      name: 'Round Trip with Foldable Wheelchair',
      data: { isRoundTrip: true, distance: 8, pickupDateTime: '2024-12-19T14:30', wheelchairType: 'foldable', clientType: 'facility' }
    },
    {
      name: 'Off-Hours Individual Client',
      data: { isRoundTrip: false, distance: 12, pickupDateTime: '2024-12-19T21:30', wheelchairType: 'no_wheelchair', clientType: 'individual' }
    },
    {
      name: 'Weekend with Power Wheelchair',
      data: { isRoundTrip: true, distance: 15, pickupDateTime: '2024-12-21T10:00', wheelchairType: 'power', clientType: 'individual' }
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pricing Model Test</h1>
        
        {/* Test Scenarios */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Test Scenarios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testScenarios.map((scenario, index) => (
              <button
                key={index}
                onClick={() => {
                  setTestData(scenario.data);
                  setPricing(calculateTripPrice(scenario.data));
                }}
                className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">{scenario.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {scenario.data.isRoundTrip ? 'Round Trip' : 'One Way'} • {scenario.data.distance} miles
                  {(scenario.data.wheelchairType === 'foldable' || scenario.data.wheelchairType === 'power') && ` • ${scenario.data.wheelchairType} wheelchair (+$25)`}
                  {scenario.data.clientType === 'individual' && ' • Individual Client'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Test Form */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Custom Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
              <select
                value={testData.isRoundTrip ? 'round' : 'one-way'}
                onChange={(e) => setTestData({...testData, isRoundTrip: e.target.value === 'round'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="one-way">One Way</option>
                <option value="round">Round Trip</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Distance (miles)</label>
              <input
                type="number"
                value={testData.distance}
                onChange={(e) => setTestData({...testData, distance: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Date/Time</label>
              <input
                type="datetime-local"
                value={testData.pickupDateTime}
                onChange={(e) => setTestData({...testData, pickupDateTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wheelchair</label>
              <select
                value={testData.wheelchairType}
                onChange={(e) => setTestData({...testData, wheelchairType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="no_wheelchair">No Wheelchair</option>
                <option value="foldable">Foldable Wheelchair (+$25)</option>
                <option value="power">Power Wheelchair (+$25)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Type</label>
              <select
                value={testData.clientType}
                onChange={(e) => setTestData({...testData, clientType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="facility">Facility Client</option>
                <option value="individual">Individual Client</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={calculateTest}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Calculate Price
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {pricing && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Pricing Breakdown</h2>
            
            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    Total: {formatCurrency(pricing.total)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {testData.isRoundTrip ? 'Round Trip' : 'One Way'} • {testData.distance} miles
                  </p>
                </div>
                {pricing.discount > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-green-600 font-medium">
                      You saved {formatCurrency(pricing.discount)}
                    </p>
                    <p className="text-xs text-green-500">10% individual discount</p>
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-2">
              {createPricingBreakdown(pricing, { isInFranklinCounty: true, countiesOut: 0, pickup: 'Franklin', destination: 'Franklin' }).map((item, index) => (
                <div 
                  key={index}
                  className={`flex justify-between py-2 ${
                    item.type === 'total' ? 'border-t border-gray-200 font-semibold text-lg' :
                    item.type === 'subtotal' ? 'border-t border-gray-200 font-medium' : ''
                  }`}
                >
                  <span className={
                    item.type === 'discount' ? 'text-green-600' :
                    item.type === 'premium' ? 'text-orange-600' :
                    'text-gray-700'
                  }>
                    {item.label}
                  </span>
                  <span className={
                    item.type === 'discount' ? 'text-green-600' :
                    item.type === 'premium' ? 'text-orange-600' :
                    item.type === 'total' ? 'text-gray-900 font-semibold' :
                    'text-gray-700'
                  }>
                    {formatCurrency(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Configuration Display */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Pricing Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Base Rates</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>One-way: {formatCurrency(PRICING_CONFIG.BASE_RATES.ONE_WAY)}</li>
                <li>Round trip: {formatCurrency(PRICING_CONFIG.BASE_RATES.ROUND_TRIP)}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Distance & Premiums</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Per mile: {formatCurrency(PRICING_CONFIG.DISTANCE.PER_MILE)}</li>
                <li>Off-hours: +{formatCurrency(PRICING_CONFIG.PREMIUMS.OFF_HOURS)}</li>
                <li>Weekend: +{formatCurrency(PRICING_CONFIG.PREMIUMS.WEEKEND)}</li>
                <li>Wheelchair: +{formatCurrency(PRICING_CONFIG.PREMIUMS.WHEELCHAIR)}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Discounts</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Individual client: {(PRICING_CONFIG.DISCOUNTS.INDIVIDUAL_CLIENT * 100)}%</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
