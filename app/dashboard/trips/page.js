'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import TripsView from '@/app/components/TripsView';

export default function TripsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    // Check URL for query parameters
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('cancelled') === 'true') {
      setSuccessMessage('Your trip has been successfully cancelled.');
      
      // Clear the URL parameter without refreshing the page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Check for session and fetch user data
    async function fetchUserData() {
      try {
        console.log('Checking session...');
        // Get the most fresh session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session) {
          console.log('No session found, redirecting to login');
          router.push('/login');
          return;
        }

        console.log('Session found, user authenticated');
        setUser(session.user);

        // Refresh the session first to ensure token is valid
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error('Error refreshing session:', refreshError);
          // Continue anyway, the existing session might still work
        }

        // Fetch trips data with more detailed logging
        try {
          const userId = session.user.id;
          console.log('Fetching trips for user:', userId, 'User object:', JSON.stringify(session.user));
          
          // Get user role and facility_id from profile to determine trip query
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('role, facility_id')
            .eq('id', userId)
            .single();
            
          if (profileError) {
            console.error('Error fetching user profile:', profileError);
            // Continue anyway - maybe they're a user without a profile yet
          } else {
            console.log('User role from profile:', profileData?.role, 'Facility ID:', profileData?.facility_id);
          }
          
          // Build trips query based on user role - simple facility information only
          let tripsQuery = supabase
            .from('trips')
            .select(`
              *,
              facility:facilities(id, name, contact_email, phone_number)
            `)
            .order('created_at', { ascending: false });
          
          // For facility users, get trips for their facility
          // For regular clients, get trips where they are the user
          if (profileData?.role === 'facility' && profileData?.facility_id) {
            console.log('🏥 Facility user detected - fetching facility trips for facility:', profileData.facility_id);
            tripsQuery = tripsQuery.eq('facility_id', profileData.facility_id);
          } else {
            console.log('👤 Regular client detected - fetching user trips for user:', userId);
            tripsQuery = tripsQuery.eq('user_id', userId);
          }
          
          // Execute the query
          const { data: tripsData, error: tripsError } = await tripsQuery;
          
          // If trips are found, fetch client information separately
          let tripsWithClientInfo = [];
          if (!tripsError && tripsData && tripsData.length > 0) {
            console.log('📝 Fetching client information for trips...');
            
            // Get unique user IDs and managed client IDs
            const userIds = [...new Set(tripsData.filter(trip => trip.user_id).map(trip => trip.user_id))];
            const managedClientIds = [...new Set(tripsData.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];
            
            // Fetch user profiles
            let userProfiles = [];
            if (userIds.length > 0) {
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, phone_number')
                .in('id', userIds);
              
              if (!profilesError) {
                userProfiles = profiles || [];
              }
            }
            
            // Fetch managed clients from multiple tables (enhanced client resolution)
            let managedClients = [];
            if (managedClientIds.length > 0) {
              // Strategy 1: Try facility_managed_clients first (for facility-specific clients)
              const { data: facilityManaged, error: facilityManagedError } = await supabase
                .from('facility_managed_clients')
                .select('id, first_name, last_name, phone_number')
                .in('id', managedClientIds);
              
              if (!facilityManagedError && facilityManaged) {
                managedClients = facilityManaged;
                console.log(`Found ${facilityManaged.length} clients in facility_managed_clients table`);
              }
              
              // Strategy 2: If not found in facility_managed_clients, try managed_clients
              const foundIds = managedClients.map(c => c.id);
              const missingIds = managedClientIds.filter(id => !foundIds.includes(id));
              
              if (missingIds.length > 0) {
                const { data: managed, error: managedError } = await supabase
                  .from('managed_clients')
                  .select('id, first_name, last_name, phone_number')
                  .in('id', missingIds);
                
                if (!managedError && managed) {
                  managedClients = [...managedClients, ...managed];
                  console.log(`Found ${managed.length} additional clients in managed_clients table`);
                }
              }
            }
            
            // Combine trip data with client information
            tripsWithClientInfo = tripsData.map(trip => ({
              ...trip,
              user_profile: trip.user_id ? userProfiles.find(profile => profile.id === trip.user_id) : null,
              managed_client: trip.managed_client_id ? managedClients.find(client => client.id === trip.managed_client_id) : null
            }));
          } else {
            tripsWithClientInfo = tripsData || [];
          }
          
          // If trips are found and there are driver_ids, fetch driver information
          if (!tripsError && tripsWithClientInfo && tripsWithClientInfo.length > 0) {
            const tripsWithDriverIds = tripsWithClientInfo.filter(trip => trip.driver_id);
            
            if (tripsWithDriverIds.length > 0) {
              // Get all unique driver IDs
              const driverIds = [...new Set(tripsWithDriverIds.map(trip => trip.driver_id))];
              
              // Fetch driver profiles 
              const { data: driverProfiles, error: driversError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, full_name, avatar_url')
                .in('id', driverIds);
                
              if (!driversError && driverProfiles) {
                // Map driver info to each trip
                const enrichedTrips = tripsWithClientInfo.map(trip => {
                  if (trip.driver_id) {
                    const driverProfile = driverProfiles.find(profile => profile.id === trip.driver_id);
                    return {
                      ...trip,
                      driver: driverProfile || null
                    };
                  }
                  return trip;
                });
                
                console.log(`Successfully enriched ${enrichedTrips.length} trips with driver data`);
                setTrips(enrichedTrips || []);
              } else {
                console.error('Error fetching driver profiles:', driversError);
                setTrips(tripsWithClientInfo || []);
              }
            } else {
              setTrips(tripsWithClientInfo || []);
            }
          } else {
            setTrips(tripsWithClientInfo || []);
          }

          if (tripsError) {
            console.error('Error fetching trips:', tripsError);
            console.error('Error details:', JSON.stringify(tripsError));
            setError(tripsError.message || 'An error occurred while fetching your trips');
          } else if (!tripsWithClientInfo || tripsWithClientInfo.length === 0) {
            console.log('No trips found for this user');
            setTrips([]);
          }
        } catch (tripsError) {
          console.error('Trips fetch error:', tripsError);
          setError('Failed to fetch trips data. Please try again later.');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        // More detailed error logging
        console.error('Authentication error details:', JSON.stringify(error, null, 2));
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [router, supabase]);

  // 🔄 REAL-TIME SUBSCRIPTION: Listen for trip status changes from dispatcher
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up real-time subscription for trip updates...');
    
    // Get user's facility_id for filtering (if they're a facility user)
    const setupSubscription = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', user.id)
          .single();

        // Subscribe to changes on trips table
        const subscription = supabase
          .channel('trips-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'trips'
              // Remove filter for now to catch all updates, then filter in the handler
            },
            (payload) => {
              console.log('🔄 Real-time trip update received:', payload);
              
              if (payload.new && payload.old) {
                const updatedTrip = payload.new;
                const oldTrip = payload.old;
                
                // Check if this trip belongs to the current user/facility
                const isRelevantTrip = profileData?.role === 'facility' 
                  ? updatedTrip.facility_id === profileData.facility_id
                  : updatedTrip.user_id === user.id;
                
                if (!isRelevantTrip) {
                  console.log('🔄 Trip update not relevant to current user, ignoring');
                  return;
                }
                
                // Check if this is a status change from dispatcher
                if (updatedTrip.status !== oldTrip.status) {
                  console.log(`🔄 Trip ${updatedTrip.id} status changed: ${oldTrip.status} → ${updatedTrip.status}`);
                  
                  // Update the trip in our local state
                  setTrips(prevTrips => {
                    const updatedTrips = prevTrips.map(trip => {
                      if (trip.id === updatedTrip.id) {
                        return {
                          ...trip,
                          ...updatedTrip,
                          // Preserve any enriched data we added
                          user_profile: trip.user_profile,
                          managed_client: trip.managed_client,
                          driver: trip.driver
                        };
                      }
                      return trip;
                    });
                    
                    console.log('🔄 Updated trips state with real-time changes');
                    return updatedTrips;
                  });
                  
                  // Show notification to user about the status change
                  if (updatedTrip.status === 'upcoming') {
                    setSuccessMessage(`✅ Trip approved by dispatcher! Status updated to: ${updatedTrip.status}`);
                  } else if (updatedTrip.status === 'in_process') {
                    setSuccessMessage(`💳 Trip payment processed! Trip is now in process.`);
                  } else if (updatedTrip.status === 'cancelled') {
                    setSuccessMessage(`❌ Trip was rejected by dispatcher. Reason: ${updatedTrip.cancellation_reason || 'No reason provided'}`);
                  } else if (updatedTrip.status === 'completed') {
                    setSuccessMessage(`🎉 Trip completed by dispatcher! Ready for billing.`);
                  } else {
                    setSuccessMessage(`🔄 Trip status updated to: ${updatedTrip.status}`);
                  }
                  
                  // Clear success message after 8 seconds
                  setTimeout(() => {
                    setSuccessMessage(null);
                  }, 8000);
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('🔄 Real-time subscription status:', status);
          });

        // Store subscription for cleanup
        return subscription;
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
        return null;
      }
    };

    // Set up subscription and cleanup
    setupSubscription().then(subscription => {
      if (subscription) {
        // Cleanup subscription on unmount
        return () => {
          console.log('🔄 Cleaning up real-time subscription...');
          subscription.unsubscribe();
        };
      }
    });
  }, [user, supabase]);

  const refreshTrips = async () => {
    console.log('🔄 Manual refresh triggered');
    setLoading(true);
    try {
      // Re-run the fetchUserData function to get fresh data
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      if (session?.user) {
        const userId = session.user.id;
        
        // Get user profile for facility_id
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', userId)
          .single();
        
        // Fetch fresh trips data with facility information
        let tripsQuery = supabase
          .from('trips')
          .select(`
            *,
            facility:facilities(id, name, contact_email, phone_number)
          `)
          .order('pickup_time', { ascending: false });

        if (profileData?.role === 'facility' && profileData?.facility_id) {
          tripsQuery = tripsQuery.eq('facility_id', profileData.facility_id);
        } else {
          tripsQuery = tripsQuery.eq('user_id', userId);
        }

        const { data: freshTrips, error: tripsError } = await tripsQuery;
        
        if (!tripsError && freshTrips) {
          setTrips(freshTrips);
          setSuccessMessage('✅ Trips refreshed successfully');
        }
      }
    } catch (error) {
      console.error('Error refreshing trips:', error);
      setError('Failed to refresh trips');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7CCFD0]"></div>
      </div>
    );
  }

  // If we have a user but there was an error loading trips, show error state
  if (error && user) {
    return (
      <div className="min-h-screen p-4">
        <div className="bg-[#F8F9FA] dark:bg-[#24393C] rounded-lg shadow-md border border-[#DDE5E7] dark:border-[#3F5E63] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mb-4">Your Trips</h2>
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-red-600 dark:text-red-400">
              {error || 'There was an error loading your trips. Please try again later.'}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-3 px-4 py-2 bg-[#7CCFD0] text-white rounded-md hover:bg-[#60BFC0]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TripsView user={user} trips={trips} successMessage={successMessage} onRefresh={refreshTrips} />;
}