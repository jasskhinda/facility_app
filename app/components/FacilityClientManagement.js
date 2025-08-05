'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/client-supabase';
import DashboardLayout from './DashboardLayout';

export default function FacilityClientManagement({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [facilityId, setFacilityId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, active, with_trips, no_trips
  const [clientTrips, setClientTrips] = useState({}); // Store trip counts for each client

  useEffect(() => {
    loadFacilityAndClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadFacilityAndClients = async () => {
    try {
      setLoading(true);
      const supabase = createClientSupabase();
      
      // Get facility ID from user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('facility_id, role')
        .eq('id', user.id)
        .single();
        
      if (profile?.role !== 'facility') {
        router.push('/dashboard');
        return;
      }
      
      if (!profile.facility_id) {
        console.error('No facility associated with this account');
        return;
      }
      
      setFacilityId(profile.facility_id);
      
      // Load clients for this facility using the API endpoint
      // This will fetch both authenticated clients (from profiles) and managed clients (from facility_managed_clients)
      const response = await fetch('/api/facility/clients');
      
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      
      const { clients } = await response.json();
      setClients(clients || []);
      
      // Load trip counts for each client
      await loadClientTripCounts(clients || [], supabase, profile.facility_id);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load trip counts for clients
  const loadClientTripCounts = async (clientList, supabase, currentFacilityId) => {
    try {
      if (!currentFacilityId) {
        console.log('No facility ID provided, skipping trip counts');
        return;
      }
      
      const tripCounts = {};
      
      for (const client of clientList) {
        // Count trips for this client (both user_id and managed_client_id) - FILTERED BY FACILITY
        const userTripsQuery = client.user_id 
          ? supabase.from('trips').select('*', { count: 'exact', head: true }).eq('user_id', client.user_id).eq('facility_id', currentFacilityId)
          : Promise.resolve({ count: 0 });
          
        const managedTripsQuery = client.id 
          ? supabase.from('trips').select('*', { count: 'exact', head: true }).eq('managed_client_id', client.id).eq('facility_id', currentFacilityId)
          : Promise.resolve({ count: 0 });
          
        const [userResult, managedResult] = await Promise.all([userTripsQuery, managedTripsQuery]);
        
        tripCounts[client.id] = (userResult.count || 0) + (managedResult.count || 0);
      }
      
      setClientTrips(tripCounts);
    } catch (error) {
      console.error('Error loading trip counts:', error);
      // Don't block the page if trip counting fails
      setClientTrips({});
    }
  };
  
  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone_number?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const tripCount = clientTrips[client.id] || 0;
    const isActive = client.status === 'active' || client.status === undefined || client.status === null; // Default to active if no status
    
    const matchesFilter = 
      selectedFilter === 'all' || 
      (selectedFilter === 'active' && isActive) ||
      (selectedFilter === 'with_trips' && tripCount > 0) ||
      (selectedFilter === 'no_trips' && tripCount === 0);
      
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <DashboardLayout user={user} activeTab="clients">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7CCFD0]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="clients">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white  rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#2E4F54] text-gray-900">
                Client Management
              </h1>
              <p className="text-[#2E4F54]/80 text-gray-900/80 mt-1">
                {clients.length} total clients
              </p>
            </div>
            <Link
              href="/dashboard/clients/add"
              className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add New Client
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white  rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 placeholder-[#2E4F54]/50 dark:placeholder-[#E0F4F5]/50 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg bg-white  text-[#2E4F54] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Clients</option>
              <option value="active">Active Clients</option>
              <option value="with_trips">Clients with Trips</option>
              <option value="no_trips">New Clients (No Trips)</option>
            </select>
          </div>
        </div>

        {/* Client List */}
        <div className="bg-white  rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#E0E0E0] overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-[#2E4F54]/60 text-gray-900/60">
                {searchTerm ? 'No clients found matching your search' : 'No clients yet'}
              </p>
              {!searchTerm && (
                <Link
                  href="/dashboard/clients/add"
                  className="inline-block mt-4 text-[#7CCFD0] hover:text-[#60BFC0]"
                >
                  Add your first client →
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#DDE5E7] dark:divide-[#E0E0E0]">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-4 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#7CCFD0]/20 rounded-full flex items-center justify-center">
                          <span className="text-[#7CCFD0] font-semibold">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-[#2E4F54] text-gray-900">
                            {client.first_name} {client.last_name}
                          </h3>
                          <div className="text-sm text-[#2E4F54]/60 text-gray-900/60">
                            {client.email} • {client.phone_number}
                          </div>
                          <div className="text-xs text-[#7CCFD0] font-medium mt-1">
                            {clientTrips[client.id] ? `${clientTrips[client.id]} trips completed` : 'New client'}
                          </div>
                        </div>
                      </div>
                      {client.medical_requirements && (
                        <div className="mt-2 text-sm text-[#2E4F54]/60 text-gray-900/60">
                          <span className="font-medium">Medical notes:</span> {client.medical_requirements}
                        </div>
                      )}
                      {client.accessibility_needs && (
                        <div className="mt-1 text-sm text-[#2E4F54]/60 text-gray-900/60">
                          <span className="font-medium">Accessibility:</span> {client.accessibility_needs}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        client.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {client.status || 'active'}
                      </span>
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/book?client=${client.id}`}
                          className="px-3 py-1 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white text-sm rounded-lg transition-colors"
                        >
                          Book Trip
                        </Link>
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="px-3 py-1 border border-[#DDE5E7] dark:border-[#E0E0E0] hover:bg-gray-100 text-[#2E4F54] text-gray-900 text-sm rounded-lg transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/clients/${client.id}/edit`}
                          className="px-3 py-1 border border-[#DDE5E7] dark:border-[#E0E0E0] hover:bg-gray-100 text-[#2E4F54] text-gray-900 text-sm rounded-lg transition-colors"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}