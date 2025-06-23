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

  // Initialize selectedMonth
  useEffect(() => {
    // Set to current month (June 2025) which should be the first option
    const currentDate = new Date('2025-06-23');
    const currentMonth = currentDate.toISOString().slice(0, 7); // '2025-06'
    setSelectedMonth(currentMonth);
    
    // Set display month to match
    const displayText = currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    setDisplayMonth(displayText);
    
    console.log('📅 Initialized to:', currentMonth, '(' + displayText + ')');
  }, []);

  // Update display month when selectedMonth changes
  useEffect(() => {
    if (selectedMonth) {
      try {
        const monthDisplay = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        setDisplayMonth(monthDisplay);
        console.log('📅 Display month updated to:', monthDisplay);
      } catch (error) {
        setDisplayMonth(selectedMonth);
      }
    }
  }, [selectedMonth]);

  // Fetch data when month or facility changes
  useEffect(() => {
    if (selectedMonth && facilityId) {
      fetchFacilityInfo();
      fetchMonthlyTrips(selectedMonth);
    }
  }, [selectedMonth, facilityId]);

  const fetchFacilityInfo = async () => {
    if (!facilityId) return;

    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('name, billing_email, address, phone_number')
        .eq('id', facilityId)
        .single();

      if (error) {
        console.error('Facility fetch error:', error);
        return;
      }

      setFacility(data);
    } catch (err) {
      console.error('Error fetching facility info:', err);
    }
  };

  const fetchMonthlyTrips = async (monthToFetch = selectedMonth) => {
    if (!monthToFetch || !facilityId) return;

    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 Fetching trips for:', { monthToFetch, facilityId });
      
      // Get facility users
      const { data: facilityUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('facility_id', facilityId)
        .eq('role', 'facility');
      
      if (usersError || !facilityUsers?.length) {
        console.error('No facility users found:', usersError);
        setError('No facility users found');
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      console.log(`✅ Found ${facilityUsers.length} facility users`);
      const userIds = facilityUsers.map(u => u.id);

      // Calculate date range using the passed month parameter
      const startDate = new Date(monthToFetch + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log('📅 Date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      // Query trips with simplified approach
      const { data: trips, error: tripsError } = await supabase
        .from('trips')
        .select(`
          id,
          pickup_address,
          destination_address,
          pickup_time,
          price,
          wheelchair_type,
          is_round_trip,
          additional_passengers,
          status,
          user_id
        `)
        .in('user_id', userIds)
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString())
        .not('price', 'is', null)
        .gt('price', 0)
        .order('pickup_time', { ascending: false });

      console.log('🚗 Query result:', { 
        trips: trips?.length || 0, 
        error: tripsError?.message || 'none'
      });

      if (tripsError) {
        console.error('Trips query error:', tripsError);
        setError(`Failed to fetch trips: ${tripsError.message}`);
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      if (!trips || trips.length === 0) {
        console.log('📊 No trips found for this month');
        setMonthlyTrips([]);
        setTotalAmount(0);
        setError('');
        return;
      }

      // Add user information to trips
      const enhancedTrips = trips.map(trip => {
        const user = facilityUsers.find(u => u.id === trip.user_id);
        return {
          ...trip,
          user: user || null
        };
      });

      // Calculate total
      const total = enhancedTrips.reduce((sum, trip) => sum + (parseFloat(trip.price) || 0), 0);
      
      console.log('✅ Success:', {
        trips: enhancedTrips.length,
        total: `$${total.toFixed(2)}`
      });

      setMonthlyTrips(enhancedTrips);
      setTotalAmount(total);
      setError('');

    } catch (err) {
      console.error('Error fetching trips:', err);
      setError('Failed to load trip data');
      setMonthlyTrips([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date('2025-06-23');
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    
    return options;
  };

  const downloadRideSummary = () => {
    try {
      const csvContent = `Compassionate Care Transportation - Monthly Invoice
Facility: ${facility?.name || 'Unknown Facility'}
Month: ${displayMonth}
Total Amount: $${totalAmount.toFixed(2)}
Total Trips: ${monthlyTrips.length}

Date,Client,Pickup Address,Destination,Price,Status
${monthlyTrips.map(trip => {
  const date = trip.pickup_time ? new Date(trip.pickup_time).toLocaleDateString() : 'N/A';
  const client = trip.user ? `${trip.user.first_name} ${trip.user.last_name}` : 'Unknown Client';
  const pickup = (trip.pickup_address || '').replace(/"/g, '""');
  const destination = (trip.destination_address || '').replace(/"/g, '""');
  const price = (trip.price || 0).toFixed(2);
  const status = trip.status || 'unknown';
  return `${date},"${client}","${pickup}","${destination}","$${price}",${status}`;
}).join('\n')}`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CCT-Invoice-${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to generate download');
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Summary */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Monthly Ride Summary
            </h2>
            <p className="text-sm text-gray-600">
              Showing trips for {displayMonth}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const newMonth = e.target.value;
                console.log('📅 Month changed to:', newMonth);
                
                setSelectedMonth(newMonth);
                setError('');
                setLoading(true);
                setMonthlyTrips([]);
                setTotalAmount(0);
                
                // Update display immediately
                try {
                  const newDisplay = new Date(newMonth + '-01').toLocaleDateString('en-US', { 
                    month: 'long', year: 'numeric' 
                  });
                  setDisplayMonth(newDisplay);
                } catch (err) {
                  setDisplayMonth(newMonth);
                }
                
                // CRITICAL FIX: Fetch data for the new month
                if (facilityId) {
                  fetchMonthlyTrips(newMonth);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {getMonthOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        {/* Download Button */}
        <div className="flex justify-center">
          <button
            onClick={downloadRideSummary}
            disabled={loading || monthlyTrips.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            📥 Download Monthly Summary
          </button>
        </div>
      </div>

      {/* Trips List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading trips...</p>
        </div>
      ) : monthlyTrips.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Trip Details ({monthlyTrips.length} trips)
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Route</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthlyTrips.map((trip) => {
                  const formattedDate = trip.pickup_time ? 
                    new Date(trip.pickup_time).toLocaleDateString() : 'N/A';
                  const clientName = trip.user ? 
                    `${trip.user.first_name} ${trip.user.last_name}` : 'Unknown Client';

                  return (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{formattedDate}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{clientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs">
                          <p className="truncate font-medium">{trip.pickup_address || 'Unknown pickup'}</p>
                          <p className="truncate text-xs text-gray-500">
                            → {trip.destination_address || 'Unknown destination'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">
                        ${(trip.price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                          trip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {trip.status || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No trips found for {displayMonth}</p>
        </div>
      )}
    </div>
  );
}
