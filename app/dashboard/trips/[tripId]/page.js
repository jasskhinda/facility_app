'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import DashboardLayout from '@/app/components/DashboardLayout';
import EditTripForm from '@/app/components/EditTripForm';
import PricingDisplay from '@/app/components/PricingDisplay';
import { createPricingBreakdown, formatCurrency } from '@/lib/pricing';

// Cost Breakdown Component - Uses EXACT PricingDisplay from booking page
function ProfessionalCostBreakdown({ trip, onPricingCalculated }) {
  const [clientInfoData, setClientInfoData] = useState(null);
  const [holidayData, setHolidayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pricingResult, setPricingResult] = useState(null);

  // Prepare EXACT same data format as booking page
  const formData = {
    pickupAddress: trip.pickup_address,
    destinationAddress: trip.destination_address || trip.dropoff_address,
    pickupDate: new Date(trip.pickup_time).toISOString().split('T')[0],
    pickupTime: new Date(trip.pickup_time).toTimeString().slice(0, 5),
    isRoundTrip: trip.is_round_trip || false,
    wheelchairType: trip.wheelchair_type || 'none',
    additionalPassengers: trip.additional_passengers || 0,
    isEmergency: trip.is_emergency || false
  };

  const selectedClient = {
    client_type: trip.facility_id ? 'managed' : 'authenticated'
  };

  // Use EXACT stored distance
  const routeInfo = trip.distance ? {
    distance: {
      miles: parseFloat(trip.distance),
      text: trip.route_distance_text || `${trip.distance} miles`
    },
    duration: {
      text: trip.route_duration_text || trip.route_duration || ''
    }
  } : null;

  const wheelchairData = {
    type: trip.wheelchair_type || 'none',
    needsProvided: trip.wheelchair_type === 'provided' || trip.wheelchair_type === 'wheelchair',
    isTransportChair: trip.wheelchair_type === 'transport_not_allowed'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        let clientInfo = { weight: '250' };

        // Fetch client weight if managed client
        if (trip.managed_client_id) {
          const { data: clientData } = await supabase
            .from('facility_managed_clients')
            .select('weight')
            .eq('id', trip.managed_client_id)
            .single();
          
          if (clientData?.weight) {
            clientInfo = { weight: clientData.weight };
          } else {
            // If no weight found, but the price suggests bariatric was used, force bariatric weight
            const expectedBariatricPrice = trip.is_round_trip ? 300 : 150; // Base bariatric fare
            const actualBaseFare = parseFloat((trip.price / (parseFloat(trip.distance || 1) * 4 + 100)).toFixed(2)) * (trip.is_round_trip ? 300 : 150);
            
            // If the price structure suggests bariatric pricing was used during booking
            if (trip.price >= 600) { // Threshold suggesting bariatric
              clientInfo = { weight: '350' }; // Force bariatric weight
              console.log('🚨 FORCING bariatric weight due to high trip price:', trip.price);
            }
          }
        } else {
          // For non-managed clients, infer weight from price
          if (trip.price >= 600) { // Threshold suggesting bariatric
            clientInfo = { weight: '350' }; // Force bariatric weight
            console.log('🚨 FORCING bariatric weight for non-managed client due to price:', trip.price);
          }
        }

        // Use same holiday detection logic as booking page
        const pickupDate = new Date(trip.pickup_time);
        const month = pickupDate.getMonth() + 1;
        const day = pickupDate.getDate();
        
        // Check for fixed holidays (same logic as pricing.js)
        const fixedHolidays = [
          { month: 1, day: 1, name: "New Year's Day" },
          { month: 12, day: 31, name: "New Year's Eve" },
          { month: 7, day: 4, name: "Independence Day" },
          { month: 12, day: 24, name: "Christmas Eve" },
          { month: 12, day: 25, name: "Christmas Day" }
        ];
        
        const holiday = fixedHolidays.find(h => h.month === month && h.day === day);
        const holidayInfo = {
          isHoliday: !!holiday,
          holidayName: holiday?.name || '',
          surcharge: holiday ? 100 : 0
        };

        setClientInfoData(clientInfo);
        setHolidayData(holidayInfo);
      } catch (error) {
        console.error('Error fetching data:', error);
        setClientInfoData({ weight: '250' });
        setHolidayData({ isHoliday: false, holidayName: '', surcharge: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [trip]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-6 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // Use hidden PricingDisplay to get the calculated data
  return (
    <>
      {/* Hidden PricingDisplay to get the exact calculation */}
      <div style={{ position: 'absolute', left: '-9999px', visibility: 'hidden', opacity: 0 }}>
        <PricingDisplay 
          formData={formData}
          selectedClient={selectedClient}
          routeInfo={routeInfo}
          wheelchairData={wheelchairData}
          clientInfoData={clientInfoData}
          holidayData={holidayData}
          isVisible={true}
          onPricingCalculated={(pricing) => {
            if (pricing && !pricingResult) {
              setPricingResult(pricing);
              // Pass the pricing result to parent component
              if (onPricingCalculated) {
                onPricingCalculated(pricing);
              }
            }
          }}
        />
      </div>
      
      {/* Display the breakdown manually */}
      {pricingResult && pricingResult.pricing ? (
        <>
          {createPricingBreakdown(pricingResult.pricing, pricingResult.countyInfo).map((item, index) => (
            <div key={index} className={`flex justify-between items-center py-2 ${
              item.type === 'total' ? 'border-t-2 border-[#7CCFD0] pt-3 bg-[#F8F9FA] rounded-lg px-4 mt-4' : 
              item.type === 'subtotal' ? 'border-t border-[#DDE5E7] dark:border-[#E0E0E0] pt-2' :
              'border-b border-[#DDE5E7] dark:border-[#E0E0E0]'
            }`}>
              <span className={`${item.type === 'total' ? 'text-lg font-semibold' : 'text-sm'} ${
                item.type === 'total' ? 'text-[#2E4F54] text-gray-900' :
                item.type === 'discount' ? 'text-green-600 dark:text-green-400' :
                item.type === 'premium' ? 'text-orange-600 dark:text-orange-400' :
                'text-[#2E4F54] text-gray-900'
              }`}>
                {item.label}
              </span>
              <span className={`${item.type === 'total' ? 'text-lg font-bold text-[#7CCFD0]' : 'text-sm font-medium'} ${
                item.type === 'total' ? '' :
                item.type === 'discount' ? 'text-green-600 dark:text-green-400' :
                item.type === 'premium' ? 'text-orange-600 dark:text-orange-400' :
                'text-[#2E4F54] text-gray-900'
              }`}>
                {formatCurrency(Math.abs(item.amount))}
              </span>
            </div>
          ))}
        </>
      ) : (
        <div className="text-center py-4 text-gray-500">
          Calculating pricing breakdown...
        </div>
      )}
    </>
  );
}

export default function TripDetailsPage() {
  const params = useParams();
  const tripId = params.tripId;
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [cancellingTrip, setCancellingTrip] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [calculatedPricing, setCalculatedPricing] = useState(null);

  // Download trip details as PDF-style document
  const downloadTripDetails = () => {
    try {
      const clientName = trip.user_profile 
        ? `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 'Unknown Client'
        : trip.managed_client
        ? `${trip.managed_client.first_name || ''} ${trip.managed_client.last_name || ''}`.trim() || 'Unknown Client'
        : 'Unknown Client';
      
      const clientType = trip.user_profile ? 'Registered Client' : trip.managed_client ? 'Managed Client' : 'Unknown';
      
      // Create pricing breakdown text using the calculated pricing (same as booking page)
      let pricingBreakdownText = '';
      if (calculatedPricing && calculatedPricing.pricing) {
        const breakdown = createPricingBreakdown(calculatedPricing.pricing, calculatedPricing.countyInfo);
        pricingBreakdownText = breakdown.map(item => {
          if (item.type === 'total') {
            return `------------------------------------------------\n${item.label.toUpperCase()}: ${formatCurrency(item.amount)}`;
          }
          return `${item.label}: ${formatCurrency(item.amount)}`;
        }).join('\n');
      } else {
        // Fallback to trip.price if no calculated pricing available
        pricingBreakdownText = `TOTAL AMOUNT: $${trip.price?.toFixed(2) || '0.00'}`;
      }
      
      const tripDetails = `
COMPASSIONATE CARE TRANSPORTATION
TRIP DETAILS & RECEIPT

================================================
TRIP INFORMATION
================================================
Trip ID: ${trip.id}
Date: ${formatDate(trip.pickup_time)}
Status: ${trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
Type: ${trip.is_round_trip ? 'Round Trip' : 'One Way'}

================================================
CLIENT INFORMATION
================================================
Name: ${clientName}
Type: ${clientType}
${trip.user_profile?.phone_number || trip.managed_client?.phone_number ? `Phone: ${trip.user_profile?.phone_number || trip.managed_client?.phone_number}` : ''}
${trip.user_profile?.email ? `Email: ${trip.user_profile.email}` : ''}

================================================
ROUTE DETAILS
================================================
Pickup Address: ${trip.pickup_address}
Destination: ${trip.destination_address || trip.dropoff_address}
${trip.distance ? `Distance: ${trip.distance} miles` : ''}

================================================
SERVICE REQUIREMENTS
================================================
Accessibility: ${trip.wheelchair_type === 'wheelchair' ? 'Wheelchair Accessible Vehicle Required' : 'Standard Vehicle'}
${trip.additional_passengers && trip.additional_passengers > 0 ? `Additional Passengers: ${trip.additional_passengers}` : ''}
${trip.notes ? `Special Instructions: ${trip.notes}` : ''}

================================================
COST BREAKDOWN
================================================
${pricingBreakdownText}
${trip.status === 'completed' ? 'Payment Status: AWAITING PAYMENT' : ''}
${trip.status === 'cancelled' && trip.refund_status ? `Refund Status: ${trip.refund_status}` : ''}

================================================
${trip.driver ? `
DRIVER INFORMATION
================================================
Driver: ${trip.driver.profile?.full_name || `${trip.driver.profile?.first_name || ''} ${trip.driver.profile?.last_name || ''}`.trim() || 'Unknown'}
${trip.driver.profile?.phone_number ? `Contact: ${trip.driver.profile.phone_number}` : ''}
${trip.vehicle ? `Vehicle: ${trip.vehicle}` : ''}
` : ''}
================================================
BOOKING DETAILS
================================================
Booked: ${formatDate(trip.created_at)}
${trip.status === 'cancelled' && trip.cancellation_reason ? `Cancellation Reason: ${trip.cancellation_reason}` : ''}

================================================
Thank you for choosing Compassionate Care Transportation!

For questions or support, please contact us:
Website: https://compassionatecaretransportation.com
================================================
      `.trim();

      // Create and download the file
      const blob = new Blob([tripDetails], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trip-details-${trip.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage('Trip details downloaded successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error downloading trip details:', error);
      setError('Failed to download trip details. Please try again.');
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session) {
          router.push('/login');
          return;
        }
        
        setUser(session.user);
        
        // Get user role and facility_id from profile to determine trip access
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          // Continue anyway - maybe they're a user without a profile yet
        }
        
        // Build trip query based on user role (same logic as trips list page)
        let tripData = null;
        let tripError = null;
        
        // For facility users, allow access to any trip for their facility
        // For regular clients, only allow access to their own trips
        if (profileData?.role === 'facility' && profileData?.facility_id) {
          console.log('🏥 Facility user accessing trip - checking facility access');
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .eq('facility_id', profileData.facility_id)
            .single();
          tripData = data;
          tripError = error;
        } else {
          console.log('👤 Regular client accessing trip - checking user access');
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .eq('user_id', session.user.id)
            .single();
          tripData = data;
          tripError = error;
        }
        
        if (tripError) {
          console.error('Trip query error:', tripError);
          console.error('Trip error code:', tripError.code);
          console.error('Trip error details:', JSON.stringify(tripError));
          
          if (tripError.code === 'PGRST116') {
            setError('Trip not found or you do not have permission to view it.');
          } else if (tripError.code === 'PGRST004') {
            setError('Database connection error. Please try again.');
          } else {
            setError(tripError.message || 'Failed to load trip data');
          }
          return;
        }
        
        if (!tripData) {
          setError('Trip not found or you do not have permission to view it.');
          return;
        }
        
        // Enhance trip data with client information (same approach as trips list)
        let enhancedTripData = { ...tripData };
        
        // Fetch client profile information if user_id exists
        if (tripData.user_id) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, phone_number, email')
            .eq('id', tripData.user_id)
            .single();
          
          if (userProfile) {
            enhancedTripData.user_profile = userProfile;
          }
        }
        
        // Fetch managed client information if managed_client_id exists
        if (tripData.managed_client_id) {
          try {
            const { data: managedClient, error: managedClientError } = await supabase
              .from('facility_managed_clients')
              .select('id, first_name, last_name, phone_number')
              .eq('id', tripData.managed_client_id)
              .single();
            
            if (managedClientError) {
              console.error('Error fetching managed client:', managedClientError);
              // Try alternative table name if the first one fails
              const { data: altManagedClient } = await supabase
                .from('managed_clients')
                .select('id, first_name, last_name, phone_number')
                .eq('id', tripData.managed_client_id)
                .single();
              
              if (altManagedClient) {
                enhancedTripData.managed_client = altManagedClient;
              }
            } else if (managedClient) {
              enhancedTripData.managed_client = managedClient;
            }
          } catch (err) {
            console.error('Error fetching managed client data:', err);
          }
        }
        
        // If trip has a driver_id, fetch driver information separately
        if (enhancedTripData.driver_id) {
          const { data: driverData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, avatar_url, phone_number')
            .eq('id', enhancedTripData.driver_id)
            .single();
            
          if (driverData) {
            // Add driver information to trip data
            enhancedTripData.driver = {
              id: enhancedTripData.driver_id,
              profile: driverData
            };
          }
        }
        
        // If trip has a last_edited_by, fetch editor information
        if (enhancedTripData.last_edited_by) {
          const { data: editorData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('id', enhancedTripData.last_edited_by)
            .single();
            
          if (editorData) {
            enhancedTripData.editor = editorData;
          }
        }
        
        setTrip(enhancedTripData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [tripId, router, supabase]);
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  // Handle cancellation
  const handleCancelTrip = async () => {
    if (!trip || trip.status === 'completed' || trip.status === 'cancelled') return;
    
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason || 'Customer cancelled',
          refund_status: 'Pending'
        })
        .eq('id', tripId)
        .select();
        
      if (error) {
        console.error('Error cancelling trip:', error);
        throw new Error('Failed to cancel trip. Please try again.');
      }
      
      // Update local trip state
      setTrip({
        ...trip,
        status: 'cancelled',
        cancellation_reason: cancelReason || 'Customer cancelled',
        refund_status: 'Pending'
      });
      
      setCancellingTrip(false);
      setCancelReason('');
      setSuccessMessage('Trip cancelled successfully');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle trip edit save
  const handleTripSave = (updatedTrip) => {
    setTrip(updatedTrip);
    setShowEditForm(false);
    setSuccessMessage('Trip updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handle trip edit cancel
  const handleTripEditCancel = () => {
    setShowEditForm(false);
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending':
        return 'status-pending';
      case 'upcoming':
        return 'status-upcoming';
      case 'in_process':
        return 'status-in-process';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      case 'in_progress':
        return 'status-in-progress';
      default:
        return 'bg-gray-100 text-[#2E4F54] dark:bg-gray-800 text-gray-900';
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={null} activeTab="trips">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7CCFD0]"></div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (error) {
    return (
      <DashboardLayout user={user} activeTab="trips">
        <div className="bg-[#F8F9FA]  rounded-lg shadow-md border border-[#DDE5E7] dark:border-[#E0E0E0] p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[#2E4F54] text-gray-900">Trip Details</h2>
            <Link 
              href="/dashboard/trips" 
              className="text-[#7CCFD0] hover:text-[#60BFC0]"
            >
              Back to All Trips
            </Link>
          </div>
          
          <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-md">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0]"
            >
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!trip) {
    return (
      <DashboardLayout user={user} activeTab="trips">
        <div className="bg-[#F8F9FA]  rounded-lg shadow-md border border-[#DDE5E7] dark:border-[#E0E0E0] p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[#2E4F54] text-gray-900">Trip Details</h2>
            <Link 
              href="/dashboard/trips" 
              className="text-[#7CCFD0] hover:text-[#60BFC0]"
            >
              Back to All Trips
            </Link>
          </div>
          
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-md">
            <p>Trip not found.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="trips">
      <div className="bg-[#F8F9FA]  rounded-lg shadow-md border border-[#DDE5E7] dark:border-[#E0E0E0] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#2E4F54] text-gray-900">Trip Details</h2>
          <Link 
            href="/dashboard/trips" 
            className="text-[#7CCFD0] hover:text-[#60BFC0] flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Trips
          </Link>
        </div>
        
        {successMessage && (
          <div className="p-4 mb-6 rounded-md bg-[#7CCFD0]/20 text-[#2E4F54] dark:bg-[#7CCFD0]/30 text-gray-900">
            {successMessage}
          </div>
        )}
        
        {/* Trip Status */}
        <div className="mb-6">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(trip.status)}`}>
            {trip.status === 'pending' ? 'Pending Approval' :
             trip.status === 'upcoming' ? 'Upcoming' : 
             trip.status === 'in_process' ? 'In Process (Paid)' :
             trip.status === 'completed' ? 'Completed' : 
             trip.status === 'in_progress' ? 'In Progress' : 'Cancelled'}
          </span>
          <p className="mt-2 text-sm text-[#2E4F54]/70 text-gray-900/70">
            Trip ID: {trip.id}
          </p>
        </div>
        
        {/* Trip Details Card */}
        <div className="bg-white  rounded-lg p-6 shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] mb-6">
          <h3 className="text-lg font-medium mb-6 text-[#2E4F54] text-gray-900">Trip Information</h3>
          
          {/* Client Information Section - For facility users */}
          {(trip.user_profile || trip.managed_client) && (
            <div className="mb-6 p-4 bg-[#F8F9FA]  rounded-lg border border-[#DDE5E7] dark:border-[#E0E0E0]">
              <h4 className="text-md font-medium mb-3 text-[#2E4F54] text-gray-900">Client Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Client Name</p>
                  <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                    {trip.user_profile 
                      ? `${trip.user_profile.first_name || ''} ${trip.user_profile.last_name || ''}`.trim() || 'Unknown'
                      : trip.managed_client
                      ? `${trip.managed_client.first_name || ''} ${trip.managed_client.last_name || ''}`.trim() || 'Unknown'
                      : 'Unknown Client'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Client Type</p>
                  <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                    {trip.user_profile ? 'Registered Client' : trip.managed_client ? 'Managed Client' : 'Unknown'}
                  </p>
                </div>
                {(trip.user_profile?.phone_number || trip.managed_client?.phone_number) && (
                  <div>
                    <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Phone Number</p>
                    <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                      {trip.user_profile?.phone_number || trip.managed_client?.phone_number}
                    </p>
                  </div>
                )}
                {trip.user_profile?.email && (
                  <div>
                    <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Email</p>
                    <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.user_profile.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Trip Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Pickup Date & Time</p>
              <p className="text-sm text-[#2E4F54]/90 text-gray-900/90 font-medium">{formatDate(trip.pickup_time)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Trip Type</p>
              <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                {trip.is_round_trip ? 'Round Trip' : 'One Way'}
              </p>
            </div>
            
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">Route</p>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs text-[#2E4F54]/60 text-gray-900/60">Pickup Address</p>
                    <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs text-[#2E4F54]/60 text-gray-900/60">Destination Address</p>
                    <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.destination_address || trip.dropoff_address}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Trip Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(trip.status)} mt-1`}>
                {trip.status === 'pending' ? 'Pending Approval' :
                 trip.status === 'upcoming' ? 'Upcoming' : 
                 trip.status === 'in_process' ? 'In Process (Paid)' :
                 trip.status === 'completed' ? 'Completed' : 
                 trip.status === 'in_progress' ? 'In Progress' : 'Cancelled'}
              </span>
            </div>
            
            <div>
              <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Accessibility Requirements</p>
              <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                {trip.wheelchair_type === 'wheelchair' ? 'Wheelchair Accessible Vehicle Required' : 
                 trip.accessibility_needs ? trip.accessibility_needs : 'Standard Vehicle'}
              </p>
            </div>
            
            {trip.distance && (
              <div>
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Estimated Distance</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                  {trip.is_round_trip ? (trip.distance * 2).toFixed(1) : trip.distance} miles
                  {trip.is_round_trip && (
                    <span className="text-xs text-gray-500 ml-1">({trip.distance} mi each way)</span>
                  )}
                </p>
              </div>
            )}
            
            {trip.additional_passengers && trip.additional_passengers > 0 && (
              <div>
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Additional Passengers</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.additional_passengers}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Booking Date</p>
              <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{formatDate(trip.created_at)}</p>
            </div>
            
            {/* Edit Tracking Information */}
            {trip.last_edited_by && trip.editor && (
              <div>
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Last Edited</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                  {formatDate(trip.last_edited_at || trip.updated_at)}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  ✏️ EDITED BY {trip.edited_by_role?.toUpperCase() || 'UNKNOWN'}
                  {trip.editor.first_name && (
                    <span className="ml-1">({trip.editor.first_name} {trip.editor.last_name})</span>
                  )}
                </p>
              </div>
            )}
            
            {trip.notes && (
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Special Instructions</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.notes}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Cost Breakdown Section */}
        <div className="bg-white  rounded-lg p-6 shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] mb-6">
          <h3 className="text-lg font-medium mb-4 text-[#2E4F54] text-gray-900">Cost Breakdown</h3>
          
          <div className="space-y-3">
            <ProfessionalCostBreakdown 
              trip={trip} 
              onPricingCalculated={(pricing) => {
                setCalculatedPricing(pricing);
              }}
            />
            
            {trip.status === 'completed' && (
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="text-[#2E4F54]/70 text-gray-900/70">Payment Status</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">Awaiting Payment</span>
              </div>
            )}
            
            {trip.status === 'cancelled' && trip.refund_status && (
              <div className="flex justify-between items-center py-2 text-sm">
                <span className="text-[#2E4F54]/70 text-gray-900/70">Refund Status</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">{trip.refund_status}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Driver Information (if assigned) */}
        {(trip.driver_id || trip.driver) && (
          <div className="bg-white  rounded-lg p-5 shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] mb-6">
            <h3 className="text-lg font-medium mb-4 text-[#2E4F54] text-gray-900">Driver Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Driver Name</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">
                  {trip.driver 
                    ? (trip.driver.profile?.full_name || `${trip.driver.profile?.first_name || ''} ${trip.driver.profile?.last_name || ''}`.trim() || trip.driver_name || trip.driver.email) 
                    : (trip.driver_name || 'Not assigned')
                  }
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Vehicle</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.vehicle || 'Not available'}</p>
              </div>
              
              {trip.driver?.profile?.phone_number && (
                <div>
                  <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Contact</p>
                  <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.driver.profile.phone_number}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Status-specific sections */}
        {trip.status === 'completed' && trip.rating && (
          <div className="bg-white  rounded-lg p-5 shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] mb-6">
            <h3 className="text-lg font-medium mb-4 text-[#2E4F54] text-gray-900">Your Rating</h3>
            
            <div className="flex items-center mb-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i}
                    className={`h-5 w-5 ${i < (trip.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="ml-2 text-sm text-[#2E4F54] text-gray-900">{trip.rating} out of 5</span>
            </div>
            
            {trip.review && (
              <div>
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Your Review</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.review}</p>
              </div>
            )}
          </div>
        )}
        
        {trip.status === 'cancelled' && (
          <div className="bg-white  rounded-lg p-5 shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] mb-6">
            <h3 className="text-lg font-medium mb-4 text-[#2E4F54] text-gray-900">Cancellation Details</h3>
            
            <div>
              <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Reason</p>
              <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.cancellation_reason || 'Customer cancelled'}</p>
            </div>
            
            {trip.refund_status && (
              <div className="mt-3">
                <p className="text-sm font-medium text-[#2E4F54] text-gray-900">Refund Status</p>
                <p className="text-sm text-[#2E4F54]/90 text-gray-900/90">{trip.refund_status}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Edit Trip Button - Only for pending trips */}
          {trip.status === 'pending' && (
            <button
              onClick={() => setShowEditForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Trip
            </button>
          )}
          
          {/* Download Trip Details Button */}
          <button
            onClick={downloadTripDetails}
            className="px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white rounded-md inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Trip Details
          </button>
          
          {(trip.status === 'pending' || trip.status === 'upcoming') && (
            <button
              onClick={() => setCancellingTrip(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Cancel Trip
            </button>
          )}
          
          {trip.status === 'in_progress' && (
            <Link
              href={`/dashboard/track/${trip.id}`}
              className="px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white rounded-md inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Track Driver
            </Link>
          )}
          
          {trip.status === 'completed' && !trip.rating && (
            <Link
              href={`/dashboard/trips?rate=${trip.id}`}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md"
            >
              Rate Trip
            </Link>
          )}
          
          {trip.status === 'completed' && (
            <button
              onClick={() => router.push(`/dashboard/book?rebook=${trip.id}`)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            >
              Book Similar Trip
            </button>
          )}
        </div>
      </div>
      
      {/* Cancellation Modal */}
      {cancellingTrip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white  rounded-lg p-6 w-full max-w-md mx-4 border border-[#DDE5E7] dark:border-[#E0E0E0]">
            <h3 className="text-lg font-medium mb-4 text-[#2E4F54] text-gray-900">Cancel Trip</h3>
            <p className="text-[#2E4F54]/80 text-gray-900/80 mb-4">
              Are you sure you want to cancel this trip? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md  text-[#2E4F54] text-gray-900"
                placeholder="Please provide a reason..."
                rows={3}
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setCancellingTrip(false)}
                className="px-4 py-2 text-sm font-medium text-[#2E4F54] text-gray-900 bg-[#F8F9FA]  rounded-md hover:bg-[#DDE5E7] dark:hover:bg-[#E0E0E0]/50 border border-[#DDE5E7] dark:border-[#E0E0E0]"
                disabled={isSubmitting}
              >
                Keep Trip
              </button>
              <button
                onClick={handleCancelTrip}
                className="px-4 py-2 text-sm font-medium text-white bg-[#7CCFD0] rounded-md hover:bg-[#60BFC0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7CCFD0]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Form Modal */}
      {showEditForm && (
        <EditTripForm 
          trip={trip}
          onSave={handleTripSave}
          onCancel={handleTripEditCancel}
        />
      )}
    </DashboardLayout>
  );
}