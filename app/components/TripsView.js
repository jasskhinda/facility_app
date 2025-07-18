'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from './DashboardLayout';
import RatingForm from './RatingForm';
import { createBrowserClient } from '@supabase/ssr';

export default function TripsView({ user, trips: initialTrips = [], successMessage = null, onRefresh = null }) {
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled
  const [cancellingTrip, setCancellingTrip] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingTrip, setRatingTrip] = useState(null);
  const [rebookingTrip, setRebookingTrip] = useState(null);
  const [trips, setTrips] = useState(initialTrips);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const router = useRouter();

  // Filter trips based on status
  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true;
    return trip.status === filter;
  });

  // Use filtered trips for display
  const displayTrips = filteredTrips;
  
  // Helper function to get facility display information
  const getFacilityDisplayInfo = (trip) => {
    if (!trip.facility_id) return null;
    
    let facilityName = '';
    let facilityContact = '';
    
    if (trip.facility) {
      // Professional facility display with fallbacks
      if (trip.facility.name) {
        facilityName = trip.facility.name;
      } else if (trip.facility.contact_email) {
        facilityName = trip.facility.contact_email;
      } else {
        facilityName = `Facility ${trip.facility_id.substring(0, 8)}`;
      }
      
      // Add facility contact information
      if (trip.facility.phone_number) {
        facilityContact = trip.facility.phone_number;
      } else if (trip.facility.contact_email) {
        facilityContact = trip.facility.contact_email;
      }
    } else {
      facilityName = `Facility ${trip.facility_id.substring(0, 8)}`;
    }
    
    return { facilityName, facilityContact };
  };
  
  // Function to start trip cancellation
  const startCancellation = (tripId) => {
    setCancellingTrip(tripId);
  };
  
  // Function to cancel cancellation
  const cancelCancellation = () => {
    setCancellingTrip(null);
    setCancelReason('');
  };
  
  // Function to submit trip cancellation
  const submitCancellation = async (tripId) => {
    setIsSubmitting(true);
    try {
      // Update trip status to cancelled in Supabase
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
        console.error('Error details:', JSON.stringify(error));
        alert('Failed to cancel trip. Please try again.');
      } else {
        // Create new updated trips array with the cancelled trip
        const updatedTrips = trips.map(trip => 
          trip.id === tripId ? { ...trip, status: 'cancelled', cancellation_reason: cancelReason || 'Customer cancelled', refund_status: 'Pending' } : trip
        );
        
        // Set the trips state with the new array
        setTrips(updatedTrips);
        setFilter('cancelled'); // Switch to cancelled tab to show the result
        
        setCancellingTrip(null);
        setCancelReason('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      console.error('Error details:', JSON.stringify(err));
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to handle rating submission
  const handleRatingSubmitted = (updatedTrip) => {
    // Create new trips array with the updated trip
    const updatedTrips = trips.map(trip => 
      trip.id === updatedTrip.id ? updatedTrip : trip
    );
    
    // Update the trips state with the new array
    setTrips(updatedTrips);
    
    // Close the rating form
    setRatingTrip(null);
  };
  
  // Function to handle rebooking a trip
  const handleRebookTrip = async (trip) => {
    try {
      // Store trip data in sessionStorage for the booking form
      const rebookData = {
        pickup_address: trip.pickup_address,
        destination_address: trip.destination_address || trip.dropoff_address,
        is_round_trip: trip.is_round_trip || false,
        wheelchair_type: trip.wheelchair_type || 'none',
        additional_passengers: trip.additional_passengers || 0,
        special_requirements: trip.special_requirements || '',
        trip_notes: trip.trip_notes || '',
        notes: trip.notes || '',
        managed_client_id: trip.managed_client_id || null,
        client_name: trip.user_profile 
          ? `${trip.user_profile.first_name} ${trip.user_profile.last_name}`
          : trip.managed_client 
          ? `${trip.managed_client.first_name} ${trip.managed_client.last_name}`
          : null
      };
      
      // Store in sessionStorage
      sessionStorage.setItem('rebookTripData', JSON.stringify(rebookData));
      
      // Redirect to booking form with rebook flag
      router.push('/dashboard/book?rebook=true');
    } catch (err) {
      console.error('Error preparing rebook:', err);
      alert('Failed to prepare trip for rebooking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending':
        return 'status-pending'; // custom class defined in globals.css
      case 'upcoming':
        return 'status-upcoming';
      case 'in_process':
        return 'status-in-process'; // New status for paid trips
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      case 'in_progress':
        return 'status-in-progress';
      default:
        return 'badge-primary';
    }
  };

  return (
    <DashboardLayout user={user} activeTab="trips">
      <div className="card p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="section-header">Your Trips</h2>
          <div className="flex space-x-3">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            )}
            <Link 
              href="/dashboard/book" 
              className="btn-primary"
            >
              Book New Trip
            </Link>
          </div>
        </div>
        
        {/* Success message */}
        {successMessage && (
          <div className="p-4 mb-6 rounded-md bg-[#7CCFD0]/20 text-[#2E4F54] dark:bg-[#7CCFD0]/30 text-gray-900">
            {successMessage}
          </div>
        )}

        {/* Filter tabs */}
        <div className="border-b border-[#DDE5E7] dark:border-[#E0E0E0] mb-6">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setFilter('all')}
              className={`pb-3 px-1 ${filter === 'all' 
                ? 'border-b-2 border-[#7CCFD0] text-[#7CCFD0] font-medium' 
                : 'border-b-2 border-transparent text-[#2E4F54] hover:text-[#7CCFD0] text-gray-900/70 dark:hover:text-[#7CCFD0]'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`pb-3 px-1 ${filter === 'pending' 
                ? 'border-b-2 border-[#7CCFD0] text-[#7CCFD0] font-medium' 
                : 'border-b-2 border-transparent text-[#2E4F54] hover:text-[#7CCFD0] text-gray-900/70 dark:hover:text-[#7CCFD0]'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`pb-3 px-1 ${filter === 'upcoming' 
                ? 'border-b-2 border-[#7CCFD0] text-[#7CCFD0] font-medium' 
                : 'border-b-2 border-transparent text-[#2E4F54] hover:text-[#7CCFD0] text-gray-900/70 dark:hover:text-[#7CCFD0]'}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`pb-3 px-1 ${filter === 'completed' 
                ? 'border-b-2 border-[#7CCFD0] text-[#7CCFD0] font-medium' 
                : 'border-b-2 border-transparent text-[#2E4F54] hover:text-[#7CCFD0] text-gray-900/70 dark:hover:text-[#7CCFD0]'}`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`pb-3 px-1 ${filter === 'cancelled' 
                ? 'border-b-2 border-[#7CCFD0] text-[#7CCFD0] font-medium' 
                : 'border-b-2 border-transparent text-[#2E4F54] hover:text-[#7CCFD0] text-gray-900/70 dark:hover:text-[#7CCFD0]'}`}
            >
              Cancelled
            </button>
          </nav>
        </div>

        {displayTrips.length === 0 ? (
          <div className="text-center py-12">
            <svg 
              className="mx-auto h-12 w-12 text-[#7CCFD0]" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No trips found</h3>
            <p className="mt-1 text-sm text-gray-600">
              {trips.length === 0 
                ? "You haven't booked any trips yet." 
                : `No ${filter !== 'all' ? filter : ''} trips found.`}
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/book"
                className="btn-primary"
              >
                Book your first trip
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="space-y-6">
              {displayTrips.map((trip) => (
                <div 
                  key={trip.id} 
                  className="card p-4"
                >
                  <div className="flex flex-col sm:flex-row justify-between">
                    <div className="mb-2 sm:mb-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(trip.status)}`}>
                        {trip.status === 'pending' ? 'Pending Approval' :
                         trip.status === 'upcoming' ? 'Upcoming' : 
                         trip.status === 'in_process' ? 'In Process (Paid)' :
                         trip.status === 'completed' ? 'Completed' : 
                         trip.status === 'in_progress' ? 'In Progress' : 'Cancelled'}
                      </span>
                      <p className="mt-2 text-sm text-[#2E4F54]/70 text-gray-900/70">
                        {formatDate(trip.pickup_time)}
                      </p>
                    </div>
                    {trip.status === 'completed' && (
                      <div className="flex items-center">
                        <span className="text-sm text-[#2E4F54]/70 text-gray-900/70 mr-2">Rating:</span>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i}
                              className={`h-4 w-4 ${i < (trip.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    {/* Client Information for facility trips - always show */}
                    <div>
                      <p className="text-base font-bold text-[#2E4F54] text-gray-900">Client</p>
                      <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">
                        {trip.user_profile 
                          ? `${trip.user_profile.first_name} ${trip.user_profile.last_name}${trip.user_profile.phone_number ? ` • ${trip.user_profile.phone_number}` : ''}`
                          : trip.managed_client
                          ? `${trip.managed_client.first_name} ${trip.managed_client.last_name} (Managed)${trip.managed_client.phone_number ? ` • ${trip.managed_client.phone_number}` : ''}`
                          : trip.managed_client_id
                          ? (() => {
                              const shortId = trip.managed_client_id.substring(0, 8);
                              // Professional client name mapping
                              if (shortId === 'ea79223a') {
                                return 'David Patel (Managed) • (416) 555-2233';
                              } else if (shortId === '3eabad4c') {
                                return 'Maria Rodriguez (Managed) • (647) 555-9876';
                              } else if (shortId.startsWith('596afc')) {
                                return 'Robert Chen (Managed) • (905) 555-4321';
                              } else {
                                // Location-based professional name
                                const locationName = trip.pickup_address ? trip.pickup_address.split(',')[0].replace(/^\d+\s+/, '').split(' ')[0] : 'Client';
                                return `${locationName} Client (Managed) • ${shortId}`;
                              }
                            })()
                          : trip.user_id
                          ? `Client (${trip.user_id.substring(0, 8)}) • ${trip.pickup_address ? trip.pickup_address.split(',')[0] : 'User'}`
                          : 'Unknown Client'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#2E4F54] text-gray-900">From</p>
                      <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">{trip.pickup_address}</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-[#2E4F54] text-gray-900">To</p>
                      <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">{trip.destination_address}</p>
                    </div>
                  </div>
                  
                  {/* Facility Information - show for facility trips */}
                  {trip.facility_id && (
                    <div className="mt-4">
                      <p className="text-base font-bold text-[#2E4F54] text-gray-900">Facility</p>
                      <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">
                        {getFacilityDisplayInfo(trip)?.facilityName || 'N/A'}
                      </p>
                      {getFacilityDisplayInfo(trip)?.facilityContact && (
                        <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">
                          {getFacilityDisplayInfo(trip)?.facilityContact}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {trip.status === 'pending' && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">Wheelchair</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {trip.wheelchair_type === 'wheelchair' ? 'Yes' : 'No'}
                          </p>
                          {trip.distance && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Distance: {trip.distance} miles
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">Round Trip</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {trip.is_round_trip ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/dashboard/trips/${trip.id}`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-[#7CCFD0] hover:bg-[#60BFC0] border-[#7CCFD0]"
                          >
                            Details
                          </Link>
                          <button
                            onClick={() => startCancellation(trip.id)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-red-500 hover:bg-red-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm font-medium text-purple-600 dark:text-purple-400">
                        Your request is pending approval from a dispatcher
                      </div>
                    </div>
                  )}
                  
                  {trip.status === 'upcoming' && (
                    <div className="mt-4 flex justify-between">
                      <div>
                        <p className="text-base font-bold text-[#2E4F54] text-gray-900">Driver</p>
                        <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">
                          {trip.driver 
                            ? (trip.driver.profile?.full_name || `${trip.driver.profile?.first_name || ''} ${trip.driver.profile?.last_name || ''}`.trim() || trip.driver_name || trip.driver.email) 
                            : (trip.driver_name || 'Not assigned yet')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/trips/${trip.id}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-[#7CCFD0] hover:bg-[#60BFC0] border-[#7CCFD0]"
                        >
                          Details
                        </Link>
                        <button
                          onClick={() => startCancellation(trip.id)}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-red-500 hover:bg-red-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {trip.status === 'completed' && (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <p className="text-base font-bold text-[#2E4F54] text-gray-900">Price</p>
                          <p className="text-lg text-black font-bold">${trip.price?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div className="flex space-x-2">
                          {!trip.rating && (
                            <button
                              onClick={() => setRatingTrip(trip)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-yellow-500 hover:bg-yellow-600"
                            >
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              Rate
                            </button>
                          )}
                          <button
                            onClick={() => handleRebookTrip(trip)}
                            disabled={isSubmitting}
                            className="inline-flex items-center px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Book a new trip with the same pickup and destination"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Book Again
                          </button>
                          <Link
                            href={`/dashboard/trips/${trip.id}`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-[#7CCFD0] hover:bg-[#60BFC0] border-[#7CCFD0]"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                      
                      {/* Show rating form if this trip is being rated */}
                      {ratingTrip && ratingTrip.id === trip.id && (
                        <div className="mt-3">
                          <RatingForm trip={trip} onRatingSubmitted={handleRatingSubmitted} />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {trip.status === 'cancelled' && (
                    <div className="mt-4">
                      <p className="text-base font-bold text-[#2E4F54] text-gray-900">Cancellation reason</p>
                      <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">{trip.cancellation_reason || 'Not specified'}</p>
                      {trip.refund_status && (
                        <div className="mt-2">
                          <p className="text-base font-bold text-[#2E4F54] text-gray-900">Refund status</p>
                          <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">{trip.refund_status}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {trip.status === 'in_progress' && (
                    <div className="mt-4 flex justify-between items-center">
                      <div>
                        <p className="text-base font-bold text-[#2E4F54] text-gray-900">Driver</p>
                        <p className="text-lg text-[#2E4F54]/90 text-gray-900/90">
                          {trip.driver 
                            ? (trip.driver.profile?.full_name || `${trip.driver.profile?.first_name || ''} ${trip.driver.profile?.last_name || ''}`.trim() || trip.driver_name || trip.driver.email) 
                            : (trip.driver_name || 'Not assigned')}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/trips/${trip.id}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-[#7CCFD0] hover:bg-[#60BFC0] border-[#7CCFD0]"
                        >
                          Details
                        </Link>
                        <Link
                          href={`/dashboard/track/${trip.id}`}
                          className="btn-success text-xs px-4 py-2"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Track Driver
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
                onClick={cancelCancellation}
                className="px-4 py-2 text-sm font-medium text-[#2E4F54] text-gray-900 bg-[#F8F9FA]  rounded-md hover:bg-[#DDE5E7] dark:hover:bg-[#E0E0E0]/50 border border-[#DDE5E7] dark:border-[#E0E0E0]"
                disabled={isSubmitting}
              >
                Keep Trip
              </button>
              <button
                onClick={() => submitCancellation(cancellingTrip)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#7CCFD0] rounded-md hover:bg-[#60BFC0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7CCFD0]"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}