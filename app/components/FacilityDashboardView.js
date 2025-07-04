'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from './DashboardLayout';
import { createClientSupabase } from '@/lib/client-supabase';
// Icons will be replaced with SVGs or emojis for now

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

        // Get client stats
        const { count: totalClients } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', profile.facility_id)
          .eq('role', 'facility');

        const { count: activeClients } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', profile.facility_id)
          .eq('role', 'facility')
          .eq('status', 'active');

        // Get all facility users for trip filtering
        const { data: facilityUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('facility_id', profile.facility_id);

        const facilityUserIds = facilityUsers?.map(user => user.id) || [];
        console.log('Facility user IDs for dashboard:', facilityUserIds.length, 'users found');

        // Get trip stats - filter by user_id instead of facility_id
        const today = new Date().toISOString().split('T')[0];
        let todayTripsQuery = supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .gte('pickup_time', today + 'T00:00:00')
          .lte('pickup_time', today + 'T23:59:59');
        
        if (facilityUserIds.length > 0) {
          todayTripsQuery = todayTripsQuery.in('user_id', facilityUserIds);
        }
        
        const { count: todayTrips } = await todayTripsQuery;

        // Get weekly trips
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        let weeklyTripsQuery = supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .gte('pickup_time', weekAgo.toISOString());
        
        if (facilityUserIds.length > 0) {
          weeklyTripsQuery = weeklyTripsQuery.in('user_id', facilityUserIds);
        }
        
        const { count: weeklyTrips } = await weeklyTripsQuery;

        // Get recent trips with client info
        let recentTripsQuery = supabase
          .from('trips')
          .select(`
            *,
            user:profiles!trips_user_id_fkey(first_name, last_name)
          `)
          .order('pickup_time', { ascending: false })
          .limit(10);
        
        if (facilityUserIds.length > 0) {
          recentTripsQuery = recentTripsQuery.in('user_id', facilityUserIds);
        }
        
        const { data: trips, error: tripsError } = await recentTripsQuery;
        
        if (tripsError) {
          console.error('Recent trips query error:', tripsError);
        }
        
        console.log('Recent trips data:', trips?.length || 0, 'trips found');
        console.log('Recent trips sample:', trips?.slice(0, 2));

        // Calculate monthly spend from completed trips
        const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        let monthlyTripsQuery = supabase
          .from('trips')
          .select('price')
          .eq('status', 'completed')
          .gte('pickup_time', firstOfMonth.toISOString());
        
        if (facilityUserIds.length > 0) {
          monthlyTripsQuery = monthlyTripsQuery.in('user_id', facilityUserIds);
        }
        
        const { data: monthlyCompletedTrips } = await monthlyTripsQuery;
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
            {facilityName} Dashboard
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
                <p className="text-sm font-medium text-[#2E4F54]/60 text-gray-900/60">Monthly Spend</p>
                <p className="text-2xl font-semibold text-[#2E4F54] text-gray-900 mt-1">
                  ${stats.monthlySpend.toFixed(2)}
                </p>
                <p className="text-sm text-orange-500 mt-1">{stats.pendingInvoices} pending invoices</p>
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
                <div key={trip.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#24393C] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-[#7CCFD0]/10 rounded-full p-2">
                        <span className="text-lg">🕐</span>
                      </div>
                      <div>
                        <p className="font-medium text-[#2E4F54] text-gray-900">
                          {trip.user?.first_name && trip.user?.last_name ? 
                            `${trip.user.first_name} ${trip.user.last_name}` : 
                            'Unknown Client'
                          }
                        </p>
                        <p className="text-sm text-[#2E4F54]/60 text-gray-900/60">
                          {new Date(trip.pickup_time).toLocaleDateString()} at {new Date(trip.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        trip.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        trip.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {trip.status}
                      </span>
                      <Link
                        href={`/dashboard/trips/${trip.id}`}
                        className="text-sm text-[#7CCFD0] hover:text-[#60BFC0] ml-3"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-[#2E4F54]/60 text-gray-900/60">No recent trips</p>
                <Link
                  href="/dashboard/book"
                  className="inline-flex items-center mt-4 text-[#7CCFD0] hover:text-[#60BFC0]"
                >
                  <span className="mr-1">➕</span>
                  Book your first trip
                </Link>
              </div>
            )}
          </div>
          {recentTrips.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-[#1A2A2D] border-t border-[#DDE5E7] dark:border-[#E0E0E0]">
              <Link
                href="/dashboard/trips"
                className="text-sm text-[#7CCFD0] hover:text-[#60BFC0] font-medium"
              >
                View all trips →
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}