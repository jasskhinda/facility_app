"use client";

import React, { useState } from 'react';
import FacilityBookingForm from '../components/FacilityBookingForm';

// Mock user and supabase for testing
const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com'
};

const mockSupabase = {
  from: (table) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({
          data: {
            role: 'facility_admin',
            facility_id: 'test-facility-123'
          },
          error: null
        })
      }),
      order: () => Promise.resolve({
        data: [],
        error: null
      })
    }),
    insert: () => Promise.resolve({
      data: { id: 'test-booking-123' },
      error: null
    })
  }),
  auth: {
    getUser: () => Promise.resolve({
      data: { user: mockUser },
      error: null
    })
  }
};

// Mock the context
const MockAuthProvider = ({ children }) => {
  return (
    <div>
      {React.cloneElement(children, { 
        user: mockUser,
        supabase: mockSupabase 
      })}
    </div>
  );
};

export default function RealBookingFormTest() {
  const [testMessage, setTestMessage] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">Real Booking Form Test</h1>
          <p className="text-sm text-gray-600">
            This is the actual FacilityBookingForm component. Test holiday dates to see if the $100 surcharge appears.
          </p>
          <div className="mt-2 p-2 bg-yellow-100 rounded">
            <p className="text-sm font-medium">🧪 Test these holiday dates in 2025:</p>
            <ul className="text-xs mt-1 space-y-1">
              <li>• December 25, 2025 (Christmas Day)</li>
              <li>• January 1, 2025 (New Year's Day)</li>
              <li>• July 4, 2025 (Independence Day)</li>
              <li>• January 20, 2025 (MLK Day)</li>
              <li>• November 27, 2025 (Thanksgiving)</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg">
          <MockAuthProvider>
            <FacilityBookingForm />
          </MockAuthProvider>
        </div>

        {testMessage && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="text-sm">{testMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}
