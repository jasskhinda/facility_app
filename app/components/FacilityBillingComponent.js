'use client';

import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';

export default function FacilityBillingComponent({ user, facilityId }) {
  const [monthlyTrips, setMonthlyTrips] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [facility, setFacility] = useState(null);

  const supabase = createClientSupabase();

  useEffect(() => {
    fetchFacilityInfo();
    fetchMonthlyTrips();
  }, [selectedMonth]);

  const fetchFacilityInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('name, billing_email, address, phone_number')
        .eq('id', facilityId)
        .single();

      if (!error && data) {
        setFacility(data);
      }
    } catch (error) {
      console.error('Error fetching facility info:', error);
    }
  };

  const fetchMonthlyTrips = async () => {
    setLoading(true);
    try {
      const startDate = new Date(selectedMonth + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

      const { data: trips, error } = await supabase
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
        .in('status', ['completed', 'pending', 'upcoming'])
        .order('pickup_time', { ascending: false });

      if (error) throw error;

      // Calculate total amount
      const total = trips?.reduce((sum, trip) => sum + (trip.price || 0), 0) || 0;
      
      setMonthlyTrips(trips || []);
      setTotalAmount(total);
    } catch (error) {
      console.error('Error fetching monthly trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    try {
      const invoiceData = {
        facilityName: facility?.name || 'Unknown Facility',
        month: selectedMonth,
        trips: monthlyTrips,
        totalAmount: totalAmount,
        billingEmail: facility?.billing_email,
        facilityAddress: facility?.address
      };

      // Here you would integrate with your invoice generation system
      // For now, we'll create a downloadable summary
      downloadRideSummary(invoiceData);
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const downloadRideSummary = (invoiceData) => {
    const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });

    const csvContent = `Compassionate Care Transportation - Monthly Invoice
Facility: ${invoiceData.facilityName}
Month: ${monthName}
Total Amount: $${invoiceData.totalAmount.toFixed(2)}

Date,Pickup Address,Destination,Price,Wheelchair,Round Trip,Status
${invoiceData.trips.map(trip => {
  const date = new Date(trip.pickup_time).toLocaleDateString();
  const wheelchair = trip.wheelchair_type === 'no_wheelchair' ? 'No' : 'Yes';
  const roundTrip = trip.is_round_trip ? 'Yes' : 'No';
  return `${date},"${trip.pickup_address}","${trip.destination_address}","$${(trip.price || 0).toFixed(2)}",${wheelchair},${roundTrip},${trip.status}`;
}).join('\n')}

Payment Instructions:
Please mail check payment to:
Compassionate Care Transportation
[Your Business Address]
[City, State ZIP]

Invoice Date: ${new Date().toLocaleDateString()}
Due Date: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CCT-Invoice-${invoiceData.facilityName.replace(/\s+/g, '-')}-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const sendInvoiceEmail = async () => {
    try {
      // This would integrate with your email service
      // For now, we'll show a success message
      alert(`Invoice for ${selectedMonth} will be sent to ${facility?.billing_email}`);
    } catch (error) {
      console.error('Error sending invoice email:', error);
    }
  };

  const getMonthOptions = () => {
    const options = [];
    const currentDate = new Date();
    
    // Generate last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    
    return options;
  };

  return (
    <div className="space-y-6">
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
              Monthly Billing Information
            </h3>
            <p className="text-blue-700 dark:text-blue-300 mt-2">
              This facility is billed monthly. Payment is expected via check unless otherwise arranged.
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Invoices are generated at the end of each month and sent to your billing email address.
            </p>
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
                {monthlyTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-[#F8F9FA] dark:hover:bg-[#24393C]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                      {new Date(trip.pickup_time).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                      <div className="max-w-xs">
                        <p className="truncate font-medium">{trip.pickup_address}</p>
                        <p className="truncate text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                          → {trip.destination_address}
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
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-[#2E4F54] dark:text-[#E0F4F5]">
            No trips found for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}
