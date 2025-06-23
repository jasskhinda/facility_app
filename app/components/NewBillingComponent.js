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
    // Use actual current date for accurate month initialization
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM format
    const currentMonthDisplay = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    setSelectedMonth(currentMonth);
    setDisplayMonth(currentMonthDisplay);
    
    // Generate invoice number for this month
    const invoiceNum = `CCT-${currentMonth}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    setInvoiceNumber(invoiceNum);
    
    console.log('📅 Initialized billing component to:', currentMonth, `(${currentMonthDisplay})`);
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
        console.log('📅 Display month updated to:', monthDisplay, 'from selected:', selectedMonth);
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
      setInvoiceEmail(data.billing_email || 'billing@compassionatecaretransportation.com');
    } catch (err) {
      console.error('Error fetching facility info:', err);
    }
  };

  const fetchMonthlyTrips = async (monthToFetch = selectedMonth) => {
    if (!monthToFetch || !facilityId) {
      console.log('📅 fetchMonthlyTrips: Missing required params:', { monthToFetch, facilityId });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('🔍 fetchMonthlyTrips: Starting fetch for month:', monthToFetch, 'facility:', facilityId);
      
      // Get facility users first
      const { data: facilityUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('facility_id', facilityId)
        .eq('role', 'facility');
      
      if (usersError) {
        console.error('❌ User fetch error:', usersError);
        setError('Failed to fetch facility users');
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      if (!facilityUsers?.length) {
        console.log('👥 No facility users found');
        setError('No facility users found');
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      console.log(`✅ Found ${facilityUsers.length} facility users`);
      const userIds = facilityUsers.map(u => u.id);

      // Calculate date range using the passed month parameter (CRITICAL FIX)
      const startDate = new Date(monthToFetch + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log('📅 Date range for query:', {
        monthToFetch,
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
        console.log('📊 No trips found for selected month');
        
        // Enhanced diagnostic: Check if ANY trips exist for these users
        const { data: anyTrips, error: anyTripsError } = await supabase
          .from('trips')
          .select('id, pickup_time, price, status')
          .in('user_id', userIds)
          .not('price', 'is', null)
          .gt('price', 0)
          .order('pickup_time', { ascending: false })
          .limit(10);
        
        if (!anyTripsError && anyTrips?.length > 0) {
          console.log(`📊 DIAGNOSTIC: Found ${anyTrips.length} trips in other months for these users:`);
          anyTrips.forEach(trip => {
            const tripDate = new Date(trip.pickup_time);
            console.log(`   - Trip ${trip.id}: ${tripDate.toDateString()} | $${trip.price} | ${trip.status}`);
          });
          
          // Show month distribution
          const monthCounts = {};
          anyTrips.forEach(trip => {
            const tripDate = new Date(trip.pickup_time);
            const monthKey = `${tripDate.getFullYear()}-${String(tripDate.getMonth() + 1).padStart(2, '0')}`;
            monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
          });
          console.log('📊 DIAGNOSTIC: Trips distribution by month:', monthCounts);
          
          const displayMonth = new Date(monthToFetch + '-01').toLocaleDateString('en-US', { 
            month: 'long', year: 'numeric' 
          });
          setError(`No trips found for ${displayMonth}. Found ${anyTrips.length} trips in other months (see console for details).`);
        } else {
          console.log('📊 DIAGNOSTIC: No trips found at all for facility users');
          setError('No trips found for this facility. Please contact support if this seems incorrect.');
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
    // Use actual current date for accurate month generation
    const currentDate = new Date(); // This will be June 23, 2025 in your system
    
    // Generate last 12 months starting from current month
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7); // YYYY-MM format
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
      
      // Debug log for first few months
      if (i < 3) {
        console.log(`Month ${i}: ${value} = ${label}`);
      }
    }
    
    console.log('Generated month options:', options.slice(0, 3)); // Show first 3 for debugging
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

  const generateInvoiceData = () => {
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
      month: 'long', year: 'numeric' 
    });

    return {
      invoiceNumber: invoiceNumber,
      facilityName: facility?.name || 'Unknown Facility',
      billingEmail: facility?.billing_email || 'billing@compassionatecaretransportation.com',
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
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-700 text-sm font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Professional Billing Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monthly Billing & Invoices</h1>
            <p className="text-blue-100 mt-1">
              Professional invoice management for {facility?.name || 'your facility'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-200">Invoice #</div>
            <div className="text-lg font-mono font-semibold">{invoiceNumber}</div>
          </div>
        </div>
      </div>

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
                console.log('📅 Month dropdown changed from', selectedMonth, 'to', newMonth);
                
                setSelectedMonth(newMonth);
                setError('');
                setLoading(true);
                setMonthlyTrips([]);
                setTotalAmount(0);
                
                // Update display immediately for better UX
                try {
                  const newDisplay = new Date(newMonth + '-01').toLocaleDateString('en-US', { 
                    month: 'long', year: 'numeric' 
                  });
                  setDisplayMonth(newDisplay);
                  console.log('📅 Display immediately updated to:', newDisplay);
                } catch (err) {
                  console.error('📅 Display update error:', err);
                  setDisplayMonth(newMonth);
                }
                
                // CRITICAL FIX: Fetch data for the new month immediately
                if (facilityId) {
                  console.log('📅 Triggering data fetch for month:', newMonth);
                  fetchMonthlyTrips(newMonth);
                } else {
                  console.error('📅 No facilityId available for data fetch');
                  setLoading(false);
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={openInvoiceModal}
            disabled={loading || monthlyTrips.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send Invoice
          </button>
          
          <button
            onClick={downloadRideSummary}
            disabled={loading || monthlyTrips.length === 0}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-8 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Summary
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
      
      {/* Professional Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Send Invoice</h2>
                  <p className="text-blue-100 mt-1">Invoice #{invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Invoice Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Invoice Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Period:</span>
                    <p className="font-medium text-gray-900">{displayMonth}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Trips:</span>
                    <p className="font-medium text-gray-900">{monthlyTrips.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <p className="font-bold text-blue-600 text-lg">${totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Delivery</h3>
                
                {/* Default Email */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="emailOption"
                      checked={!useAlternateEmail}
                      onChange={() => setUseAlternateEmail(false)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-900 font-medium">Default Email Address</span>
                  </label>
                  <div className="ml-7 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      {invoiceEmail || 'billing@compassionatecaretransportation.com'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      This is your facility's registered billing email
                    </p>
                  </div>
                </div>

                {/* Alternate Email */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="emailOption"
                      checked={useAlternateEmail}
                      onChange={() => setUseAlternateEmail(true)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-900 font-medium">Send to Another Email Address</span>
                  </label>
                  {useAlternateEmail && (
                    <div className="ml-7">
                      <input
                        type="email"
                        value={alternateEmail}
                        onChange={(e) => setAlternateEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={markAsPaid}
                      onChange={(e) => setMarkAsPaid(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 mt-0.5"
                    />
                    <div>
                      <span className="text-gray-900 font-medium">Already Paid?</span>
                      <p className="text-sm text-gray-600 mt-1">
                        Check this if the client has already paid this invoice
                      </p>
                      {markAsPaid && (
                        <div className="mt-2 p-2 bg-blue-100 rounded border-l-4 border-blue-500">
                          <p className="text-sm text-blue-800 font-medium">
                            Status: Pending Approval from Dispatcher
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            This invoice will be marked as paid but require dispatcher approval
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvoice}
                  disabled={invoiceSending || (!useAlternateEmail && !invoiceEmail) || (useAlternateEmail && !alternateEmail)}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {invoiceSending ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Send Invoice
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
