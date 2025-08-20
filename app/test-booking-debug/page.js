"use client";

import React, { useState } from 'react';
import PricingDisplay from '../components/PricingDisplay';

function BookingDebugPage() {
  const [formData, setFormData] = useState({
    pickupAddress: '123 Main St, Columbus, OH',
    destinationAddress: '456 Oak Ave, Columbus, OH', 
    pickupDate: '2025-12-25', // Christmas day
    pickupTime: '10:00', // 10 AM
    isRoundTrip: false,
    wheelchairType: 'none',
    isEmergency: false,
    additionalPassengers: 0
  });

  const [routeInfo] = useState({
    distance: { miles: 5.2, text: '5.2 miles' },
    duration: { text: '12 mins' }
  });

  // Simulate holiday data that should come from HolidayPricingChecker
  const [holidayData] = useState({
    isHoliday: true,
    holidayName: 'Christmas Day',
    surcharge: 100
  });

  const handlePricingCalculated = (pricing) => {
    console.log('📊 Pricing calculated:', pricing);
  };

  const handleDateTimeChange = (e) => {
    const value = e.target.value; // "2025-12-25T10:00"
    setFormData(prev => ({
      ...prev,
      pickupDate: value.split('T')[0], // "2025-12-25"
      pickupTime: value.split('T')[1]  // "10:00"
    }));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Holiday Surcharge Integration Test</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Test Data:</h2>
        <p><strong>Pickup Date:</strong> {formData.pickupDate} (Christmas Day)</p>
        <p><strong>Pickup Time:</strong> {formData.pickupTime}</p>
        <p><strong>Holiday Data:</strong> {JSON.stringify(holidayData)}</p>
        <p><strong>Expected:</strong> Holiday surcharge of $100 should be applied</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Form Data Debug</h2>
          <div className="p-4 bg-blue-50 rounded">
            <p><strong>formData.pickupDate:</strong> {formData.pickupDate}</p>
            <p><strong>formData.pickupTime:</strong> {formData.pickupTime}</p>
            <p><strong>Full datetime:</strong> {formData.pickupDate}T{formData.pickupTime}</p>
          </div>
          
          <div className="mt-4">
            <label className="block mb-2">Change Pickup Date/Time:</label>
            <input
              type="datetime-local"
              value={`${formData.pickupDate}T${formData.pickupTime}`}
              onChange={handleDateTimeChange}
              className="border p-2 rounded w-full"
            />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Pricing Display Component</h2>
          <PricingDisplay
            formData={formData}
            selectedClient={null}
            routeInfo={routeInfo}
            onPricingCalculated={handlePricingCalculated}
            wheelchairData={null}
            clientInfoData={null}
            holidayData={holidayData}
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded">
        <h3 className="font-bold text-yellow-800 mb-2">Expected Result:</h3>
        <p className="text-yellow-700">The pricing should show a $100 holiday surcharge for Christmas Day</p>
      </div>
    </div>
  );
}

export default BookingDebugPage;
