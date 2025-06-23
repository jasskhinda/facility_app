'use client';

import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';

export default function FacilityBillingComponent({ user, facilityId }) {
  const [monthlyTrips, setMonthlyTrips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [displayMonth, setDisplayMonth] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [facility, setFacility] = useState(null);
  const [error, setError] = useState('');

  const supabase = createClientSupabase();

  useEffect(() => {
    const currentMonth = '2025-06';
    setSelectedMonth(currentMonth);
    setDisplayMonth('June 2025');
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Monthly Ride Summary
        </h2>
        <p className="text-sm text-gray-600">
          Showing trips for {displayMonth}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Total Trips</h3>
            <p className="text-2xl font-bold text-gray-900">{monthlyTrips.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Total Amount</h3>
            <p className="text-2xl font-bold text-blue-600">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Billing Email</h3>
            <p className="text-sm text-gray-600 truncate">{facility?.billing_email || 'Not set'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
