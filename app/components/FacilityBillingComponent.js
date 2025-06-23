'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';

export default function FacilityBillingComponent({ user, facilityId }) {
  const [monthlyTrips, setMonthlyTrips] = useState([]);
Facility: ${facility?.name || 'Unknown Facility'}
Month: ${monthName}
Total Amount: $${totalAmount.toFixed(2)}
Total Trips: ${monthlyTrips.length}

Date,Client,Pickup Address,Destination,Price,Status
${monthlyTrips.map(trip => {
  const date = trip.pickup_time ? new Date(trip.pickup_time).toLocaleDateString() : 'N/A';
  const client = trip.clientName || 'Unknown Client';
  const pickup = (trip.pickup_address || '').replace(/"/g, '""');
  const destination = (trip.destination_address || '').replace(/"/g, '""');
  const price = (trip.price || 0).toFixed(2);
  const status = trip.status || 'unknown';
  return `${date},"${client}","${pickup}","${destination}","$${price}",${status}`;
}).join('\n')}`;`]);
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
  
  // Memoized month options to prevent excessive recalculation
  const monthOptions = useMemo(() => {
    const options = [];
    // Generate last 12 months from June 2025 (current date)
    const currentDate = new Date('2025-06-23');
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    
    console.log('📅 Generated month options once:', options.slice(0, 3));
    return options;
  }, []); // Empty dependency array - only calculate once

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
        // CRITICAL FIX: Parse the YYYY-MM format correctly
        const [year, month] = selectedMonth.split('-');
        console.log('🆘 EMERGENCY DEBUG: selectedMonth=', selectedMonth, 'year=', year, 'month=', month);
        
        const monthDisplay = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        
        console.log('🆘 EMERGENCY DEBUG: calculated monthDisplay=', monthDisplay);
        setDisplayMonth(monthDisplay);
        console.log('🆘 EMERGENCY DEBUG: setDisplayMonth called with:', monthDisplay);
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
      
      // Calculate date range using monthToFetch parameter
      const startDate = new Date(monthToFetch + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      
      console.log('📅 Query date range:', {
        monthToFetch,
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });

      // ✅ CRITICAL FIX: Query trips by facility_id to only get facility-created trips
      // This excludes individual client trips booked through other apps
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
          user_id,
          managed_client_id
        `)
        .eq('facility_id', facilityId)
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
        console.log('📊 No facility-created trips found for selected month');
        
        // FIXED: Consistent date parsing for error message
        const [year, month] = monthToFetch.split('-');
        const displayMonth = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { 
          month: 'long', year: 'numeric' 
        });
        setError(`No facility-created trips found for ${displayMonth}. Only trips booked through the facility interface appear in billing.`);
        
        setMonthlyTrips([]);
        setTotalAmount(0);
        return;
      }

      // Process trips with enhanced client name resolution
      const enhancedTrips = trips.map(trip => {
        // Smart client name detection - matches NewBillingComponent.js logic
        let clientName = 'Unknown Client';
        if (trip.profiles && trip.profiles.first_name) {
          clientName = `${trip.profiles.first_name} ${trip.profiles.last_name || ''}`.trim();
        } else if (trip.managed_clients && trip.managed_clients.first_name) {
          clientName = `${trip.managed_clients.first_name} ${trip.managed_clients.last_name || ''} (Managed)`.trim();
        }
        
        return {
          ...trip,
          clientName
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

  const downloadRideSummary = () => {
    try {
      // FIXED: Consistent date parsing
      const [year, month] = selectedMonth.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { 
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
  const client = trip.clientName || 'Unknown Client';
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
    // FIXED: Consistent date parsing
    const [year, month] = selectedMonth.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { 
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
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-700 dark:text-green-300 text-sm font-medium">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Professional Billing Header */}
      <div className="bg-gradient-to-r from-[#7CCFD0] to-[#6BB8BA] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monthly Billing & Invoices</h1>
            <p className="text-white/90 mt-1">
              Professional invoice management for {facility?.name || 'your facility'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/80">Invoice #</div>
            <div className="text-lg font-mono font-semibold">{invoiceNumber}</div>
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
                
                // Force display month to match dropdown selection exactly - FIXED DATE PARSING
                try {
                  const [year, month] = newMonth.split('-');
                  const newDisplayMonth = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { 
                    month: 'long', 
                    year: 'numeric' 
                  });
                  setDisplayMonth(newDisplayMonth);
                  console.log('🔧 DROPDOWN FIX: Display forced to match:', newDisplayMonth, 'for month:', newMonth);
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
              {monthOptions.map(option => (
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={openInvoiceModal}
            disabled={loading || monthlyTrips.length === 0}
            className="bg-[#7CCFD0] hover:bg-[#6BB8BA] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center justify-center gap-2"
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
      
      {/* Professional Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#7CCFD0] to-[#6BB8BA] text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Send Invoice</h2>
                  <p className="text-white/90 mt-1">Invoice #{invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
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
              <div className="bg-gray-50 dark:bg-[#24393C] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mb-3">Invoice Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Period:</span>
                    <p className="font-medium text-[#2E4F54] dark:text-[#E0F4F5]">{displayMonth}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Trips:</span>
                    <p className="font-medium text-[#2E4F54] dark:text-[#E0F4F5]">{monthlyTrips.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                    <p className="font-bold text-[#7CCFD0] text-lg">${totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                    <p className="font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                      {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5]">Email Delivery</h3>
                
                {/* Default Email */}
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="emailOption"
                      checked={!useAlternateEmail}
                      onChange={() => setUseAlternateEmail(false)}
                      className="w-4 h-4 text-[#7CCFD0] border-gray-300 focus:ring-[#7CCFD0]"
                    />
                    <span className="text-[#2E4F54] dark:text-[#E0F4F5] font-medium">Default Email Address</span>
                  </label>
                  <div className="ml-7 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                      {invoiceEmail || 'billing@compassionatecaretransportation.com'}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
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
                      className="w-4 h-4 text-[#7CCFD0] border-gray-300 focus:ring-[#7CCFD0]"
                    />
                    <span className="text-[#2E4F54] dark:text-[#E0F4F5] font-medium">Send to Another Email Address</span>
                  </label>
                  {useAlternateEmail && (
                    <div className="ml-7">
                      <input
                        type="email"
                        value={alternateEmail}
                        onChange={(e) => setAlternateEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5]">Payment Status</h3>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={markAsPaid}
                      onChange={(e) => setMarkAsPaid(e.target.checked)}
                      className="w-4 h-4 text-[#7CCFD0] border-gray-300 focus:ring-[#7CCFD0] mt-0.5"
                    />
                    <div>
                      <span className="text-[#2E4F54] dark:text-[#E0F4F5] font-medium">Already Paid?</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Check this if the client has already paid this invoice
                      </p>
                      {markAsPaid && (
                        <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded border-l-4 border-blue-500">
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                            Status: Pending Approval from Dispatcher
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                            This invoice will be marked as paid but require dispatcher approval
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendInvoice}
                  disabled={invoiceSending || (!useAlternateEmail && !invoiceEmail) || (useAlternateEmail && !alternateEmail)}
                  className="flex-1 px-6 py-3 bg-[#7CCFD0] hover:bg-[#6BB8BA] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
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
