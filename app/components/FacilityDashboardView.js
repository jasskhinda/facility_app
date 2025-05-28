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
          .eq('role', 'client');

        const { count: activeClients } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('facility_id', profile.facility_id)
          .eq('role', 'client')
          .eq('status', 'active');

        // Get trip stats
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

        // Get recent trips with client info
        const { data: trips } = await supabase
          .from('trips')
          .select(`
            *,
            client:profiles!user_id(first_name, last_name)
          `)
          .eq('facility_id', profile.facility_id)
          .order('created_at', { ascending: false })
          .limit(5);

        // Get billing stats
        const { data: invoices } = await supabase
          .from('invoices')
          .select('amount, status')
          .eq('facility_id', profile.facility_id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        const pendingInvoices = invoices?.filter(inv => inv.status === 'pending').length || 0;
        const monthlySpend = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

        setStats({
          totalClients: totalClients || 0,
          activeClients: activeClients || 0,
          todayTrips: todayTrips || 0,
          weeklyTrips: weeklyTrips || 0,
          pendingInvoices,
          monthlySpend: monthlySpend / 100 // Convert cents to dollars
        });

        setRecentTrips(trips || []);
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
        <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63] p-6">
          <h1 className="text-2xl font-bold text-[#2E4F54] dark:text-[#E0F4F5]">
            {facilityName} Dashboard
          </h1>
          <p className="text-[#2E4F54]/80 dark:text-[#E0F4F5]/80 mt-1">
            Manage your facility's transportation needs
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/book"
            className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white rounded-lg p-6 flex items-center justify-between transition-colors"
          >
            <div>
              <h3 className="font-semibold text-lg">Book New Trip</h3>
              <p className="text-white/80 text-sm mt-1">Schedule transportation for a client</p>
            </div>
            <span className="text-3xl">➕</span>
          </Link>

          <Link
            href="/dashboard/clients/add"
            className="bg-[#3B5B63] hover:bg-[#2E4F54] text-white rounded-lg p-6 flex items-center justify-between transition-colors"
          >
            <div>
              <h3 className="font-semibold text-lg">Add Client</h3>
              <p className="text-white/80 text-sm mt-1">Register a new client</p>
            </div>
            <span className="text-3xl">👥</span>
          </Link>

          <Link
            href="/dashboard/trips"
            className="bg-[#5C8A92] hover:bg-[#4A7880] text-white rounded-lg p-6 flex items-center justify-between transition-colors"
          >
            <div>
              <h3 className="font-semibold text-lg">Today's Schedule</h3>
              <p className="text-white/80 text-sm mt-1">View all trips for today</p>
            </div>
            <span className="text-3xl">📅</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-[#1C2C2F] rounded-lg border border-[#DDE5E7] dark:border-[#3F5E63] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">Total Clients</p>
                <p className="text-2xl font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mt-1">
                  {stats.totalClients}
                </p>
                <p className="text-sm text-[#7CCFD0] mt-1">{stats.activeClients} active</p>
              </div>
              <span className="text-4xl opacity-20">👥</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1C2C2F] rounded-lg border border-[#DDE5E7] dark:border-[#3F5E63] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">Today's Trips</p>
                <p className="text-2xl font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mt-1">
                  {stats.todayTrips}
                </p>
                <p className="text-sm text-[#7CCFD0] mt-1">{stats.weeklyTrips} this week</p>
              </div>
              <span className="text-4xl opacity-20">🚐</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#1C2C2F] rounded-lg border border-[#DDE5E7] dark:border-[#3F5E63] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">Monthly Spend</p>
                <p className="text-2xl font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mt-1">
                  ${stats.monthlySpend.toFixed(2)}
                </p>
                <p className="text-sm text-orange-500 mt-1">{stats.pendingInvoices} pending invoices</p>
              </div>
              <span className="text-4xl opacity-20">💰</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
          <div className="p-6 border-b border-[#DDE5E7] dark:border-[#3F5E63]">
            <h2 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5]">Recent Trips</h2>
          </div>
          <div className="divide-y divide-[#DDE5E7] dark:divide-[#3F5E63]">
            {recentTrips.length > 0 ? (
              recentTrips.map((trip) => (
                <div key={trip.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#24393C] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-[#7CCFD0]/10 rounded-full p-2">
                        <span className="text-lg">🕐</span>
                      </div>
                      <div>
                        <p className="font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                          {trip.client?.first_name} {trip.client?.last_name}
                        </p>
                        <p className="text-sm text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
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
                <p className="text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">No recent trips</p>
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
            <div className="p-4 bg-gray-50 dark:bg-[#1A2A2D] border-t border-[#DDE5E7] dark:border-[#3F5E63]">
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