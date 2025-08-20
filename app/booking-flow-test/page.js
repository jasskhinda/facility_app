"use client";

import React, { useState, useCallback } from 'react';
import HolidayPricingChecker from '../components/HolidayPricingChecker';

export default function BookingFlowTest() {
  const [formData, setFormData] = useState({
    pickupTime: '2025-12-25T10:00', // Start with Christmas
    pickupAddress: '123 Main St, Lancaster, PA',
    destinationAddress: '456 Oak Ave, Lancaster, PA'
  });

  const [holidayData, setHolidayData] = useState({
    isHoliday: false,
    holidayName: '',
    surcharge: 0
  });

  const [estimatedFare, setEstimatedFare] = useState(0);

  // Simulate the pricing calculation from FacilityBookingForm
  const calculatePricing = useCallback((holiday) => {
    console.log('💰 Calculating pricing with holiday data:', holiday);
    
    let basePrice = 50; // Base rate
    basePrice += 10 * 3; // 10 miles at $3/mile = $30
    
    // Holiday surcharge (applied to total bill)
    if (holiday.isHoliday) {
      console.log(`🎄 Adding holiday surcharge: $${holiday.surcharge}`);
      basePrice += holiday.surcharge; // +$100 for holidays
    }
    
    const finalPrice = Math.round(basePrice);
    console.log(`💵 Final calculated price: $${finalPrice}`);
    setEstimatedFare(finalPrice);
  }, []);

  // Handle holiday pricing changes (exact copy from FacilityBookingForm)
  const handleHolidayChange = useCallback((newHolidayData) => {
    console.log('🎯 handleHolidayChange called with:', newHolidayData);
    setHolidayData(newHolidayData);
    calculatePricing(newHolidayData);
  }, [calculatePricing]);

  const testDates = [
    { value: '2025-12-25T10:00', label: 'Christmas Day (should be +$100)' },
    { value: '2025-01-01T10:00', label: 'New Year\'s Day (should be +$100)' },
    { value: '2025-07-04T10:00', label: 'July 4th (should be +$100)' },
    { value: '2025-08-20T10:00', label: 'Regular Day (should be $80)' },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-red-600">🚨 Booking Flow Holiday Test</h1>
      
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-red-800">ISSUE REPRODUCTION</h2>
        <p className="text-sm text-red-700">
          This simulates exactly what happens in the real booking form when users select dates.
          Expected: Christmas should show $180 ($50 base + $30 miles + $100 holiday)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Form Section */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Booking Form</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pickup Date & Time</label>
              <select
                value={formData.pickupTime}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupTime: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                {testDates.map(date => (
                  <option key={date.value} value={date.value}>
                    {date.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pickup Address</label>
              <input
                type="text"
                value={formData.pickupAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destination Address</label>
              <input
                type="text"
                value={formData.destinationAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, destinationAddress: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                disabled
              />
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="p-4 bg-green-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Pricing Breakdown</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Base Rate:</span>
              <span>$50</span>
            </div>
            <div className="flex justify-between">
              <span>Distance (10 miles × $3):</span>
              <span>$30</span>
            </div>
            {holidayData.isHoliday && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>{holidayData.holidayName}:</span>
                <span>+$100</span>
              </div>
            )}
            <hr className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className={holidayData.isHoliday ? 'text-red-600' : 'text-green-600'}>
                ${estimatedFare}
              </span>
            </div>
          </div>

          {holidayData.isHoliday && (
            <div className="mt-4 p-3 bg-amber-100 rounded text-xs">
              <p className="font-medium text-amber-800">Holiday Surcharge Applied</p>
              <p className="text-amber-700">
                {holidayData.holidayName}: +$100 holiday surcharge
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Holiday Checker Component */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Holiday Detection Component</h2>
        <div className="border-2 border-dashed border-gray-300 p-4 rounded">
          <HolidayPricingChecker
            pickupDate={formData.pickupTime}
            onHolidayChange={handleHolidayChange}
            className="mt-2"
          />
          {!holidayData.isHoliday && (
            <p className="text-gray-500 text-sm">No holiday detected for selected date</p>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <div className="p-4 bg-yellow-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
        <div className="text-sm space-y-2">
          <p><strong>Selected Date:</strong> {formData.pickupTime}</p>
          <p><strong>Parsed Date:</strong> {new Date(formData.pickupTime).toString()}</p>
          <p><strong>Holiday Detected:</strong> {holidayData.isHoliday ? 'YES' : 'NO'}</p>
          <p><strong>Holiday Name:</strong> {holidayData.holidayName || 'None'}</p>
          <p><strong>Surcharge:</strong> ${holidayData.surcharge || 0}</p>
          <p><strong>Final Price:</strong> ${estimatedFare}</p>
          <p><strong>Expected for Christmas:</strong> $180 (base $50 + miles $30 + holiday $100)</p>
          <p><strong>Expected for Regular Day:</strong> $80 (base $50 + miles $30)</p>
        </div>
      </div>
    </div>
  );
}
