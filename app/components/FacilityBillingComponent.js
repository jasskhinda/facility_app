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
  
  // Invoice sending states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [useAlternateEmail, setUseAlternateEmail] = useState(false);
  const [alternateEmail, setAlternateEmail] = useState('');
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = createClientSupabase();

  // Initialize selectedMonth
  useEffect(() => {
    // Set to current month (June 2025) - this will be the first dropdown option
    const currentMonth = '2025-06';
    setSelectedMonth(currentMonth);
    setDisplayMonth('June 2025');
    
    // Generate invoice number for this month
    const invoiceNum = `CCT-${currentMonth}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setInvoiceNumber(invoiceNum);
    
    console.log('🔧 INIT: Billing component initialized to June 2025');
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
        console.log('📅 Display month updated to:', monthDisplay, 'from selectedMonth:', selectedMonth);
      } catch (error) {
        console.error('📅 Date parsing error:', error);
        setDisplayMonth(selectedMonth);
      }
    }
  }, [selectedMonth]);

  // Fetch data when month or facility changes
  useEffect(() => {
    if (selectedMonth && facilityId) {
      fetchFacilityInfo();
      fetchMonthlyTrips(selectedMonth); // Pass selectedMonth parameter
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
        setInvoiceEmail(data.billing_email || 'billing@compassionatecaretransportation.com');
        setError('');
      }
    } catch (err) {
      console.error('Error fetching facility info:', err);
      setError('Failed to load facility information');
    }
  };

  const fetchMonthlyTrips = async (monthToFetch = selectedMonth) => {
    if (!monthToFetch || !facilityId) {
      console.log('🔧 fetchMonthlyTrips: Missing params:', { monthToFetch, facilityId });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔧 fetchMonthlyTrips: Starting for month:', monthToFetch, 'facility:', facilityId);
      
      // Get facility users
      const { data: facilityUsers, error: facilityUsersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('facility_id', facilityId)
        .eq('role', 'facility');
      
      if (facilityUsersError) {
        console.error('Facility users fetch error:', facilityUsersError);
        setError('Failed to load facility users');
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      if (!facilityUsers?.length) {
        console.log('❌ No users found for facility');
        setMonthlyTrips([]);
        setTotalAmount(0);
        setError('No users found for this facility');
        return;
      }

      const facilityUserIds = facilityUsers.map(user => user.id);
      console.log('✅ Found', facilityUserIds.length, 'facility users');

      // Calculate date range using monthToFetch parameter
      const startDate = new Date(monthToFetch + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log('📅 Query date range:', {
        monthToFetch,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      // Query trips with proper date filtering
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
        .in('user_id', facilityUserIds)
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
        console.log('📊 No trips found for selected month');
        
        // Check if ANY trips exist for these users (diagnostic)
        const { data: anyTrips } = await supabase
          .from('trips')
          .select('id, pickup_time, price, status')
          .in('user_id', facilityUserIds)
          .not('price', 'is', null)
          .gt('price', 0)
          .order('pickup_time', { ascending: false })
          .limit(5);
        
        if (anyTrips?.length > 0) {
          console.log(`📊 DIAGNOSTIC: Found ${anyTrips.length} trips in other months`);
          const displayMonth = new Date(monthToFetch + '-01').toLocaleDateString('en-US', { 
            month: 'long', year: 'numeric' 
          });
          setError(`No trips found for ${displayMonth}. Found ${anyTrips.length} trips in other months (see console for details).`);
        } else {
          console.log('📊 DIAGNOSTIC: No trips found at all');
          setError('No trips found for this facility');
        }
        
        setMonthlyTrips([]);
        setTotalAmount(0);
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
      console.error('Error fetching monthly trips:', err);
      setError('Failed to load monthly trip data');
      setMonthlyTrips([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const getMonthOptions = () => {
    const options = [];
    // Generate last 12 months from June 2025 (current date)
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
      const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
        month: 'long', year: 'numeric' 
      });

      const csvContent = `Compassionate Care Transportation - Monthly Invoice
Facility: ${facility?.name || 'Unknown Facility'}
Month: ${monthName}
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

  const generateInvoiceData = () => {
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
      month: 'long', year: 'numeric' 
    });

    return {
      invoiceNumber: invoiceNumber,
      facilityName: facility?.name || 'Unknown Facility',
      billingEmail: facility?.billing_email || 'Not set',
      month: monthName,
      totalAmount: totalAmount,
      totalTrips: monthlyTrips.length,
      trips: monthlyTrips,
      generatedDate: new Date().toLocaleDateString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() // 30 days from now
    };
  };

  const sendInvoice = async () => {
    if (!facility || monthlyTrips.length === 0) {
      setError('Cannot send invoice: No facility data or trips found');
      return;
    }

    const emailToSend = useAlternateEmail ? alternateEmail : invoiceEmail;
    
    if (!emailToSend || !emailToSend.includes('@')) {
      setError('Please provide a valid email address');
      return;
    }

    setInvoiceSending(true);
    setError('');
    
    try {
      const invoiceData = generateInvoiceData();
      
      // Create invoice record in database
      const { data: invoiceRecord, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceData.invoiceNumber,
          facility_id: facilityId,
          month: selectedMonth,
          total_amount: totalAmount,
          total_trips: monthlyTrips.length,
          billing_email: emailToSend,
          status: markAsPaid ? 'pending_approval' : 'sent',
          payment_status: markAsPaid ? 'paid' : 'pending',
          due_date: invoiceData.dueDate,
          created_at: new Date().toISOString(),
          trip_ids: monthlyTrips.map(trip => trip.id)
        })
        .select()
        .single();

      if (invoiceError) {
        console.error('Invoice creation error:', invoiceError);
        setError('Failed to create invoice record');
        return;
      }

      // Here you would integrate with your email service
      // For now, we'll simulate the email sending
      console.log('📧 Invoice would be sent to:', emailToSend);
      console.log('📄 Invoice data:', invoiceData);
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccessMessage(`Invoice ${invoiceData.invoiceNumber} sent successfully to ${emailToSend}${markAsPaid ? ' and marked as paid (pending dispatcher approval)' : ''}`);
      setShowInvoiceModal(false);
      
      // Reset form
      setUseAlternateEmail(false);
      setAlternateEmail('');
      setMarkAsPaid(false);
      
      // Generate new invoice number for future use
      const newInvoiceNum = `CCT-${selectedMonth}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      setInvoiceNumber(newInvoiceNum);
      
    } catch (error) {
      console.error('Invoice sending error:', error);
      setError('Failed to send invoice. Please try again.');
    } finally {
      setInvoiceSending(false);
    }
  };

  const openInvoiceModal = () => {
    if (monthlyTrips.length === 0) {
      setError('No trips available to invoice for this month');
      return;
    }
    
    setShowInvoiceModal(true);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
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
              Monthly Billing & Invoices
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mt-2">
              View and download monthly ride summaries, manage invoices and billing information.
            </p>
          </div>
        </div>
      </div>

      {/* Month Selection and Summary */}
      <div className="bg-white dark:bg-[#1C2C2F] rounded-lg p-6 shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mb-1">
              Monthly Ride Summary
            </h2>
            <p className="text-sm text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
              Showing trips for {displayMonth}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => {
                const newMonth = e.target.value;
                console.log('🔧 DROPDOWN FIX: Month changed from', selectedMonth, 'to', newMonth);
                
                // CRITICAL FIX: Update states immediately and synchronously
                setSelectedMonth(newMonth);
                
                // Force display month to match dropdown selection exactly
                try {
                  const newDisplayMonth = new Date(newMonth + '-01').toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  });
                  setDisplayMonth(newDisplayMonth);
                  console.log('🔧 DROPDOWN FIX: Display forced to match:', newDisplayMonth);
                } catch (error) {
                  console.error('🔧 DROPDOWN FIX: Date parsing error:', error);
                  setDisplayMonth(newMonth);
                }
                
                // Clear previous data
                setError('');
                setLoading(true);
                setMonthlyTrips([]);
                setTotalAmount(0);
                
                // Fetch new data with the selected month
                if (facilityId) {
                  console.log('🔧 DROPDOWN FIX: Fetching data for month:', newMonth);
                  fetchMonthlyTrips(newMonth);
                } else {
                  console.error('🔧 DROPDOWN FIX: No facilityId available');
                  setLoading(false);
                }
              }}
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
            <h3 className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-1">Total Trips</h3>
            <p className="text-2xl font-bold text-[#2E4F54] dark:text-[#E0F4F5]">{monthlyTrips.length}</p>
          </div>
          
          <div className="bg-[#F8F9FA] dark:bg-[#24393C] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-1">Total Amount</h3>
            <p className="text-2xl font-bold text-[#7CCFD0]">${totalAmount.toFixed(2)}</p>
          </div>
          
          <div className="bg-[#F8F9FA] dark:bg-[#24393C] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-1">Billing Email</h3>
            <p className="text-sm text-[#2E4F54] dark:text-[#E0F4F5] truncate">
              {facility?.billing_email || 'Not set'}
            </p>
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-center">
          <button
            onClick={downloadRideSummary}
            disabled={loading || monthlyTrips.length === 0}
            className="bg-[#7CCFD0] hover:bg-[#6BB8BA] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            📥 Download Monthly Summary
          </button>
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
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">Route</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">Price</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[#2E4F54] dark:text-[#E0F4F5] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5E7] dark:divide-[#3F5E63]">
                {monthlyTrips.map((trip) => {
                  const formattedDate = trip.pickup_time ? 
                    new Date(trip.pickup_time).toLocaleDateString() : 'N/A';
                  const clientName = trip.user ? 
                    `${trip.user.first_name} ${trip.user.last_name}` : 'Unknown Client';

                  return (
                    <tr key={trip.id} className="hover:bg-[#F8F9FA] dark:hover:bg-[#24393C]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                        <div className="font-medium">{clientName}</div>
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
            No trips found for {displayMonth}
          </p>
        </div>
      )}
    </div>
  );
}
