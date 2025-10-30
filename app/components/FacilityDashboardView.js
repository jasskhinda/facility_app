'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from './DashboardLayout';
import { createClientSupabase } from '@/lib/client-supabase';

export default function FacilityDashboardView({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    todayTrips: 0,
    weeklyTrips: 0,
    pendingInvoices: 0,
    monthlySpend: 0
  });
  const [recentTrips, setRecentTrips] = useState([]);
  const [facilityName, setFacilityName] = useState('');

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const supabase = createClientSupabase();

      // Get facility info
      const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id')
        .eq('id', user.id)
        .single();

      if (profile?.facility_id) {
        const { data: facility } = await supabase
          .from('facilities')
          .select('name')
          .eq('id', profile.facility_id)
          .single();
        
        setFacilityName(facility?.name || 'Your Facility');

        // Get client stats from facility_managed_clients table
        const { count: totalClients } = await supabase
          .from('facility_managed_clients')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', profile.facility_id);

        const { count: activeClients } = await supabase
          .from('facility_managed_clients')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', profile.facility_id)
          .eq('status', 'active');

        console.log('📊 Client stats:', { totalClients, activeClients });

        // Get trip stats - filter by facility_id directly
        const today = new Date().toISOString().split('T')[0];
        const { count: todayTrips } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', profile.facility_id)
          .gte('pickup_time', today + 'T00:00:00')
          .lte('pickup_time', today + 'T23:59:59');

        // Get weekly trips
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { count: weeklyTrips } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', profile.facility_id)
          .gte('pickup_time', weekAgo.toISOString());

        // Get recent trips (simple query first, then enhance with client info)
        // Order by created_at to show most recently booked trips
        const { data: rawTrips, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('facility_id', profile.facility_id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (tripsError) {
          console.error('Recent trips query error:', tripsError);
        }
        
        // Enhance trips with client information (matching trips page pattern)
        let trips = [];
        if (!tripsError && rawTrips && rawTrips.length > 0) {
          console.log('📝 Enhancing trips with client information...');
          
          // Get unique user IDs and managed client IDs
          const userIds = [...new Set(rawTrips.filter(trip => trip.user_id).map(trip => trip.user_id))];
          const managedClientIds = [...new Set(rawTrips.filter(trip => trip.managed_client_id).map(trip => trip.managed_client_id))];
          
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
          
          // Fetch managed clients
          let managedClients = [];
          if (managedClientIds.length > 0) {
            const { data: facilityManaged, error: facilityManagedError } = await supabase
              .from('facility_managed_clients')
              .select('id, first_name, last_name, phone_number')
              .in('id', managedClientIds);
            
            if (!facilityManagedError && facilityManaged) {
              managedClients = facilityManaged;
            }
          }
          
          // Combine trip data with client information
          trips = rawTrips.map(trip => ({
            ...trip,
            user: trip.user_id ? userProfiles.find(profile => profile.id === trip.user_id) : null,
            managed_client: trip.managed_client_id ? managedClients.find(client => client.id === trip.managed_client_id) : null
          }));
        } else {
          trips = rawTrips || [];
        }
        
        console.log('Recent trips data:', trips?.length || 0, 'trips found');
        console.log('Recent trips sample:', trips?.slice(0, 2));

        // Calculate monthly spend from completed trips
        const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const { data: monthlyCompletedTrips } = await supabase
          .from('trips')
          .select('price')
          .eq('facility_id', profile.facility_id)
          .eq('status', 'completed')
          .gte('pickup_time', firstOfMonth.toISOString());
        const monthlySpend = monthlyCompletedTrips?.reduce((sum, trip) => sum + (parseFloat(trip.price) || 0), 0) || 0;

        // For now, set pending invoices to 0 since we don't have invoice system yet
        const pendingInvoices = 0;

        setStats({
          totalClients: totalClients || 0,
          activeClients: activeClients || 0,
          todayTrips: todayTrips || 0,
          weeklyTrips: weeklyTrips || 0,
          pendingInvoices,
          monthlySpend: monthlySpend // Already in dollars
        });

        setRecentTrips(trips || []);
        console.log('Set recent trips:', trips?.length || 0, 'trips');
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7CCFD0]"></div>
      </div>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="card p-6">
          <h1 className="section-header">
            {facilityName} - Live Production
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your facility&apos;s transportation needs
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/book"
            className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white rounded-lg p-6 flex items-center justify-between transition-colors shadow-md"
          >
            <div>
              <h3 className="font-semibold text-lg">Book New Trip</h3>
              <p className="text-white/80 text-sm mt-1">Schedule transportation for a client</p>
            </div>
            <span className="text-3xl">➕</span>
          </Link>

          <Link
            href="/dashboard/clients/add"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-6 flex items-center justify-between transition-colors shadow-md"
          >
            <div>
              <h3 className="font-semibold text-lg">Add Client</h3>
              <p className="text-white/80 text-sm mt-1">Register a new client</p>
            </div>
            <span className="text-3xl">👥</span>
          </Link>

          <Link
            href="/dashboard/trips"
            className="bg-green-500 hover:bg-green-600 text-white rounded-lg p-6 flex items-center justify-between transition-colors shadow-md"
          >
            <div>
              <h3 className="font-semibold text-lg">Today&apos;s Schedule</h3>
              <p className="text-white/80 text-sm mt-1">View all trips for today</p>
            </div>
            <span className="text-3xl">📅</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.totalClients}
                </p>
                <p className="text-sm text-[#7CCFD0] mt-1 font-medium">{stats.activeClients} active</p>
              </div>
              <span className="text-4xl opacity-20">👥</span>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today&apos;s Trips</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stats.todayTrips}
                </p>
                <p className="text-sm text-[#7CCFD0] mt-1 font-medium">{stats.weeklyTrips} this week</p>
              </div>
              <span className="text-4xl opacity-20">🚐</span>
            </div>
          </div>

          <div className="bg-white  rounded-lg border border-[#DDE5E7] dark:border-[#E0E0E0] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2E4F54]/60 text-gray-900/60">Current Month Transportation Costs</p>
                <p className="text-2xl font-semibold text-[#2E4F54] text-gray-900 mt-1">
                  ${stats.monthlySpend.toFixed(2)}
                </p>
                <p className="text-sm text-blue-600 mt-1">Billing cycle: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
              <span className="text-4xl opacity-20">💰</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white  rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0]">
          <div className="p-6 border-b border-[#DDE5E7] dark:border-[#E0E0E0]">
            <h2 className="text-lg font-semibold text-[#2E4F54] text-gray-900">Recent Trips</h2>
          </div>
          <div className="divide-y divide-[#DDE5E7] dark:divide-[#E0E0E0]">
            {recentTrips.length > 0 ? (
              recentTrips.map((trip) => (
                <div key={trip.id} className="p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-[#7CCFD0]/10 rounded-full p-2">
                        <span className="text-lg">🕐</span>
                      </div>
                      <div>
                        <p className="font-medium text-[#2E4F54] text-gray-900">
                          {trip.user?.first_name && trip.user?.last_name ? 
                            `${trip.user.first_name} ${trip.user.last_name}` : 
                            trip.managed_client?.first_name && trip.managed_client?.last_name ?
                            `${trip.managed_client.first_name} ${trip.managed_client.last_name}` :
                            'Unknown Client'
                          }
                        </p>
                        <p className="text-sm text-[#2E4F54]/60 text-gray-900/60">
                          {new Date(trip.pickup_time).toLocaleDateString()} at {new Date(trip.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                        trip.status === 'completed' ? 'bg-green-500 text-white' :
                        trip.status === 'cancelled' ? 'bg-red-500 text-white' :
                        trip.status === 'in_progress' ? 'bg-blue-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {trip.status}
                      </span>
                      <Link
                        href={`/dashboard/trips/${trip.id}`}
                        className="inline-flex items-center ml-3 px-3 py-1 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View details
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-[#2E4F54]/60 text-gray-900/60">No transportation activity yet</p>
                <Link
                  href="/dashboard/book"
                  className="inline-flex items-center mt-4 text-[#7CCFD0] hover:text-[#60BFC0]"
                >
                  <span className="mr-1">➕</span>
                  Schedule your first ride
                </Link>
              </div>
            )}
          </div>
          {recentTrips.length > 0 && (
            <div className="p-4 bg-[#F8F9FA] border-t border-[#DDE5E7]">
              <Link
                href="/dashboard/trips"
                className="inline-flex items-center px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View all trips
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}