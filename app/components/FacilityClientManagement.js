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
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, active, inactive

  useEffect(() => {
    loadFacilityAndClients();
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
      
      // Load clients for this facility
      const { data: clients } = await supabase
        .from('profiles')
        .select(`
          *,
          recent_trips:trips(count)
        `)
        .eq('facility_id', profile.facility_id)
        .eq('role', 'client')
        .order('created_at', { ascending: false });
        
      setClients(clients || []);
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search and status
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone_number?.includes(searchTerm) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesFilter = 
      selectedFilter === 'all' || 
      (selectedFilter === 'active' && client.status === 'active') ||
      (selectedFilter === 'inactive' && client.status !== 'active');
      
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
        <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63] p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#2E4F54] dark:text-[#E0F4F5]">
                Client Management
              </h1>
              <p className="text-[#2E4F54]/80 dark:text-[#E0F4F5]/80 mt-1">
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
        <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63] p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                className="w-full px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] placeholder-[#2E4F54]/50 dark:placeholder-[#E0F4F5]/50 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Clients</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Client List */}
        <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63] overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
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
            <div className="divide-y divide-[#DDE5E7] dark:divide-[#3F5E63]">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-4 hover:bg-gray-50 dark:hover:bg-[#24393C] transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#7CCFD0]/20 rounded-full flex items-center justify-center">
                          <span className="text-[#7CCFD0] font-semibold">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                            {client.first_name} {client.last_name}
                          </h3>
                          <div className="text-sm text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
                            {client.email} • {client.phone_number}
                          </div>
                        </div>
                      </div>
                      {client.medical_requirements && (
                        <div className="mt-2 text-sm text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
                          <span className="font-medium">Medical notes:</span> {client.medical_requirements}
                        </div>
                      )}
                      {client.accessibility_needs && (
                        <div className="mt-1 text-sm text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
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
                          className="px-3 py-1 border border-[#DDE5E7] dark:border-[#3F5E63] hover:bg-gray-50 dark:hover:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] text-sm rounded-lg transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/clients/${client.id}/edit`}
                          className="px-3 py-1 border border-[#DDE5E7] dark:border-[#3F5E63] hover:bg-gray-50 dark:hover:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] text-sm rounded-lg transition-colors"
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