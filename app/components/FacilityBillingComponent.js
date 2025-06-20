'use client';

import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';

export default function FacilityBillingComponent({ user, facilityId }) {
  const [monthlyTrips, setMonthlyTrips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [facility, setFacility] = useState(null);
  const [error, setError] = useState('');

  const supabase = createClientSupabase();

  // Initialize selectedMonth safely
  useEffect(() => {
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().slice(0, 7);
      setSelectedMonth(currentMonth);
    } catch (err) {
      console.error('Error setting initial month:', err);
      setError('Failed to initialize date selector');
    }
  }, []);

  useEffect(() => {
    if (selectedMonth && facilityId) {
      fetchFacilityInfo();
      fetchMonthlyTrips();
    }
  }, [selectedMonth, facilityId]);

  const fetchFacilityInfo = async () => {
    if (!facilityId) {
      setError('No facility ID provided');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('name, billing_email, address, phone_number')
        .eq('id', facilityId)
        .single();

      if (error) {
        console.error('Facility fetch error:', error);
        setError('Failed to load facility information');
        return;
      }

      if (data) {
        setFacility(data);
        setError('');
      }
    } catch (err) {
      console.error('Error fetching facility info:', err);
      setError('Failed to load facility information');
    }
  };

  const fetchMonthlyTrips = async () => {
    if (!selectedMonth || !facilityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Safely parse the selected month
      const startDate = new Date(selectedMonth + '-01');
      
      // Validate the date
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid date selected');
      }
      
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      // First get all users belonging to this facility
      const { data: facilityUsers, error: facilityUsersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('facility_id', facilityId);
      
      if (facilityUsersError) {
        console.error('Facility users fetch error:', facilityUsersError);
        setError('Failed to load facility users');
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      const facilityUserIds = facilityUsers?.map(user => user.id) || [];
      
      // Get managed clients for this facility (if table exists)
      let facilityManagedClientIds = [];
      try {
        const { data: managedClientsForFacility, error: managedClientsError } = await supabase
          .from('managed_clients')
          .select('id')
          .eq('facility_id', facilityId);
        
        if (!managedClientsError && managedClientsForFacility) {
          facilityManagedClientIds = managedClientsForFacility.map(client => client.id);
        }
      } catch (error) {
        // managed_clients table might not exist - continue without it
        console.log('managed_clients table not found, continuing without managed clients');
      }

      // If no users or managed clients, return empty
      if (facilityUserIds.length === 0 && facilityManagedClientIds.length === 0) {
        setMonthlyTrips([]);
        setTotalAmount(0);
        setError('No users or clients found for this facility');
        return;
      }

      // Now query trips for these users and managed clients
      let query = supabase
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
          user_id,
          managed_client_id
        `)
        .gte('pickup_time', startDate.toISOString())
        .lte('pickup_time', endDate.toISOString())
        .in('status', ['completed', 'pending', 'upcoming'])
        .not('price', 'is', null)
        .gt('price', 0)
        .order('pickup_time', { ascending: false });

      // Filter for trips by facility users OR managed clients  
      if (facilityUserIds.length > 0 && facilityManagedClientIds.length > 0) {
        query = query.or(`user_id.in.(${facilityUserIds.join(',')}),managed_client_id.in.(${facilityManagedClientIds.join(',')})`);
      } else if (facilityUserIds.length > 0) {
        query = query.in('user_id', facilityUserIds);
      } else if (facilityManagedClientIds.length > 0) {
        query = query.in('managed_client_id', facilityManagedClientIds);
      }

      const { data: trips, error } = await query;

      if (error) {
        console.error('Trips fetch error:', error);
        setError('Failed to load trip data');
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      // Safely calculate total amount
      const total = (trips || []).reduce((sum, trip) => {
        const price = parseFloat(trip.price) || 0;
        return sum + price;
      }, 0);
      
      setMonthlyTrips(trips || []);
      setTotalAmount(total);
      setError('');
    } catch (err) {
      console.error('Error fetching monthly trips:', err);
      setError('Failed to load monthly trip data');
      setMonthlyTrips([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    try {
      // Validate required data
      if (!facility) {
        setError('Facility information not loaded. Please refresh the page.');
        return;
      }

      if (!selectedMonth) {
        setError('Please select a month to generate invoice.');
        return;
      }

      if (!monthlyTrips || monthlyTrips.length === 0) {
        setError('No trips found for the selected month.');
        return;
      }

      const invoiceData = {
        facilityName: facility?.name || 'Unknown Facility',
        month: selectedMonth,
        trips: monthlyTrips || [],
        totalAmount: totalAmount || 0,
        billingEmail: facility?.billing_email || '',
        facilityAddress: facility?.address || ''
      };

      // Here you would integrate with your invoice generation system
      // For now, we'll create a downloadable summary
      downloadRideSummary(invoiceData);
    } catch (error) {
      console.error('Error generating invoice:', error);
      setError('Failed to generate invoice. Please try again.');
    }
  };

  const downloadRideSummary = (invoiceData) => {
    try {
      // Safely parse the month name
      let monthName;
      try {
        monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
      } catch (dateError) {
        console.error('Date parsing error:', dateError);
        monthName = selectedMonth; // Fallback to raw string
      }

      // Safely process trips data
      const safeTrips = (invoiceData.trips || []).map(trip => {
        try {
          const date = trip.pickup_time ? new Date(trip.pickup_time).toLocaleDateString() : 'N/A';
          const wheelchair = trip.wheelchair_type === 'no_wheelchair' ? 'No' : 'Yes';
          const roundTrip = trip.is_round_trip ? 'Yes' : 'No';
          const pickupAddress = (trip.pickup_address || '').replace(/"/g, '""'); // Escape quotes
          const destinationAddress = (trip.destination_address || '').replace(/"/g, '""'); // Escape quotes
          const price = parseFloat(trip.price) || 0;
          const status = trip.status || 'unknown';
          
          return `${date},"${pickupAddress}","${destinationAddress}","$${price.toFixed(2)}",${wheelchair},${roundTrip},${status}`;
        } catch (tripError) {
          console.error('Trip processing error:', tripError);
          return `N/A,"Error processing trip","","$0.00",No,No,error`;
        }
      });

      const csvContent = `Compassionate Care Transportation - Monthly Invoice
Facility: ${invoiceData.facilityName || 'Unknown Facility'}
Month: ${monthName}
Total Amount: $${(invoiceData.totalAmount || 0).toFixed(2)}

Date,Pickup Address,Destination,Price,Wheelchair,Round Trip,Status
${safeTrips.join('\n')}

PAYMENT OPTIONS:

Option 1 - Check Payment (Current):
Please mail check payment to:
Compassionate Care Transportation
[Your Business Address]
[City, State ZIP]

Option 2 - Credit Card Payment (Coming Soon):
Pay online at: https://facility.compassionatecaretransportation.com/billing
Secure payment processing via Stripe

Invoice Date: ${new Date().toLocaleDateString()}
Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Questions? Contact us at billing@compassionatecaretransportation.com
`;

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CCT-Invoice-${(invoiceData.facilityName || 'Unknown').replace(/\s+/g, '-')}-${selectedMonth}.csv`;
      
      // Ensure elements are cleaned up properly
      document.body.appendChild(a);
      a.click();
      
      // Clean up with a small delay to ensure download starts
      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
      }, 100);
      
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to generate download. Please try again.');
    }
  };

  const sendInvoiceEmail = async () => {
    try {
      // Validate required data
      if (!facility?.billing_email) {
        setError('No billing email address found. Please update your facility information.');
        return;
      }

      if (!selectedMonth) {
        setError('Please select a month to send invoice.');
        return;
      }

      if (!monthlyTrips || monthlyTrips.length === 0) {
        setError('No trips found for the selected month.');
        return;
      }

      // This would integrate with your email service
      // For now, we'll show a success message
      alert(`Invoice for ${selectedMonth} will be sent to ${facility.billing_email}`);
    } catch (error) {
      console.error('Error sending invoice email:', error);
      setError('Failed to send invoice email. Please try again.');
    }
  };

  const getMonthOptions = () => {
    try {
      const options = [];
      const currentDate = new Date();
      
      // Validate current date
      if (isNaN(currentDate.getTime())) {
        console.error('Invalid current date');
        return [{ value: '2025-06', label: 'June 2025' }]; // Fallback
      }
      
      // Generate last 12 months
      for (let i = 0; i < 12; i++) {
        try {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
          
          // Validate generated date
          if (isNaN(date.getTime())) {
            console.error(`Invalid date generated for index ${i}`);
            continue;
          }
          
          const value = date.toISOString().slice(0, 7);
          const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          options.push({ value, label });
        } catch (dateError) {
          console.error(`Error generating month option ${i}:`, dateError);
        }
      }
      
      // Ensure we have at least one option
      if (options.length === 0) {
        options.push({ value: '2025-06', label: 'June 2025' });
      }
      
      return options;
    } catch (error) {
      console.error('Error generating month options:', error);
      return [{ value: '2025-06', label: 'June 2025' }];
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display - Show at top if there's an error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 dark:text-red-300 text-sm">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Information Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              Monthly Billing & Payment Options
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mt-2">
              This facility is billed monthly with flexible payment options available.
            </p>
            <div className="mt-3 space-y-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="flex items-center">
                <span className="mr-2">💳</span>
                <span>Credit Card: Pay securely online (available soon)</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">📄</span>
                <span>Check Payment: Mail payment with invoice</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2">📧</span>
                <span>Invoices sent monthly to your billing email</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Month Selection and Summary */}
      <div className="bg-white dark:bg-[#1C2C2F] rounded-lg p-6 shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-xl font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mb-4 sm:mb-0">
            Monthly Ride Summary
          </h2>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
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
          <div className="bg-[#F8F9FA] dark:bg-[#24393C] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-1">
              Total Trips
            </h3>
            <p className="text-2xl font-bold text-[#2E4F54] dark:text-[#E0F4F5]">
              {monthlyTrips.length}
            </p>
          </div>
          
          <div className="bg-[#F8F9FA] dark:bg-[#24393C] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-1">
              Total Amount
            </h3>
            <p className="text-2xl font-bold text-[#7CCFD0]">
              ${totalAmount.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-[#F8F9FA] dark:bg-[#24393C] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-1">
              Billing Email
            </h3>
            <p className="text-sm text-[#2E4F54] dark:text-[#E0F4F5] truncate">
              {facility?.billing_email || 'Not set'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={generateInvoice}
              disabled={loading || monthlyTrips.length === 0}
              className="flex-1 bg-[#7CCFD0] hover:bg-[#6BB8BA] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              📥 Download Monthly Summary
            </button>
            
            <button
              onClick={sendInvoiceEmail}
              disabled={loading || monthlyTrips.length === 0 || !facility?.billing_email}
              className="flex-1 bg-[#2E4F54] hover:bg-[#1F3A3F] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              📧 Send Invoice Email
            </button>
          </div>

          {/* Payment Options */}
          <div className="border-t border-[#DDE5E7] dark:border-[#3F5E63] pt-4">
            <h4 className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-3">
              Payment Options
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-[#F8F9FA] dark:bg-[#24393C]">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-[#2E4F54] dark:text-[#E0F4F5]">Check Payment</h5>
                    <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">Traditional monthly billing</p>
                  </div>
                  <div className="text-green-600 dark:text-green-400">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-[#F8F9FA] dark:bg-[#24393C] opacity-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-[#2E4F54] dark:text-[#E0F4F5]">Credit Card</h5>
                    <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">Coming soon - online payments</p>
                  </div>
                  <div className="text-[#2E4F54]/50 dark:text-[#E0F4F5]/50">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
              <p>💡 <strong>Current:</strong> Download invoice and mail check payment</p>
              <p>🔮 <strong>Soon:</strong> Pay monthly invoices instantly with credit card</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trips List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7CCFD0] mx-auto"></div>
          <p className="text-[#2E4F54] dark:text-[#E0F4F5] mt-2">Loading trips...</p>
        </div>
      ) : monthlyTrips.length > 0 ? (
        <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#DDE5E7] dark:border-[#3F5E63]">
            <h3 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5]">
              Trip Details ({monthlyTrips.length} trips)
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F8F9FA] dark:bg-[#24393C]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">
                    Route
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">
                    Price
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5E7] dark:divide-[#3F5E63]">
                {monthlyTrips.map((trip) => {
                  // Safely format the date
                  let formattedDate;
                  try {
                    formattedDate = trip.pickup_time ? 
                      new Date(trip.pickup_time).toLocaleDateString() : 
                      'N/A';
                  } catch (dateError) {
                    console.error('Date formatting error for trip:', trip.id, dateError);
                    formattedDate = 'Invalid Date';
                  }

                  return (
                    <tr key={trip.id} className="hover:bg-[#F8F9FA] dark:hover:bg-[#24393C]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                        <div className="max-w-xs">
                          <p className="truncate font-medium">{trip.pickup_address || 'Unknown pickup'}</p>
                          <p className="truncate text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                            → {trip.destination_address || 'Unknown destination'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#7CCFD0]">
                        ${(trip.price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
          <p className="text-[#2E4F54] dark:text-[#E0F4F5]">
            {(() => {
              try {
                if (!selectedMonth) return 'Please select a month to view trips';
                const monthDisplay = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                });
                return `No trips found for ${monthDisplay}`;
              } catch (error) {
                console.error('Date formatting error:', error);
                return `No trips found for ${selectedMonth}`;
              }
            })()}
          </p>
        </div>
      )}
    </div>
  );
}
