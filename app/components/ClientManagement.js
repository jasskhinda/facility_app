'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';

export default function ClientManagement() {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [facilityId, setFacilityId] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccessibility, setFilterAccessibility] = useState('');

  useEffect(() => {
    if (!session?.user) {
      router.push('/login');
      return;
    }
    
    async function checkAccess() {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        if (profile.role !== 'facility') {
          router.push('/dashboard');
          return;
        }
        
        if (!profile.facility_id) {
          setError('No facility associated with this account');
          return;
        }
        
        setFacilityId(profile.facility_id);
        loadClients(profile.facility_id);
      } catch (err) {
        console.error('Error checking access:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, router, supabase]);

  const loadClients = async (facilityId) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('role', 'client');
        
      if (error) throw error;
      
      setClients(data || []);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterAccessibility(e.target.value);
  };

  // Filter clients based on search term and accessibility filter
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      searchTerm === '' || 
      client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone_number?.includes(searchTerm);
      
    const matchesFilter = 
      filterAccessibility === '' || 
      (client.accessibility_needs && client.accessibility_needs.includes(filterAccessibility));
      
    return matchesSearch && matchesFilter;
  });

  const inviteClient = async () => {
    // This would be implemented with an API endpoint to send invitations
    alert('Invitation functionality would be implemented here');
  };

  if (loading) {
    return <div className="p-4">Loading clients...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Client Management</h1>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link 
            href="/dashboard/clients/add" 
            className="px-4 py-2 bg-primary text-onPrimary rounded font-medium"
          >
            Add New Client
          </Link>
          <button 
            onClick={inviteClient}
            className="px-4 py-2 bg-secondary text-onSecondary rounded font-medium"
          >
            Invite Client
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="sr-only">Search Clients</label>
          <input
            id="search"
            type="text"
            placeholder="Search clients by name or phone..."
            className="w-full p-2 border rounded"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="sm:w-1/3">
          <label htmlFor="accessibility" className="sr-only">Filter by Accessibility</label>
          <select
            id="accessibility"
            className="w-full p-2 border rounded"
            value={filterAccessibility}
            onChange={handleFilterChange}
          >
            <option value="">All Accessibility Needs</option>
            <option value="wheelchair">Wheelchair</option>
            <option value="vision">Visual Impairment</option>
            <option value="hearing">Hearing Impairment</option>
            <option value="mobility">Mobility Aid</option>
            <option value="cognitive">Cognitive Support</option>
          </select>
        </div>
      </div>
      
      {filteredClients.length === 0 ? (
        <div className="text-center py-8 bg-surface rounded">
          <p className="text-lg text-gray-500">No clients found</p>
          <p className="mt-2 text-sm text-gray-500">Add clients to your facility to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-surface">
              <tr>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Contact</th>
                <th className="py-3 px-4 text-left">Address</th>
                <th className="py-3 px-4 text-left">Accessibility Needs</th>
                <th className="py-3 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-surface">
                  <td className="py-3 px-4">
                    <Link href={`/dashboard/clients/${client.id}`} className="text-primary hover:underline">
                      {client.full_name || `${client.first_name} ${client.last_name}`}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <div>{client.phone_number}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="truncate max-w-xs">{client.address}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="truncate max-w-xs">{client.accessibility_needs}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <Link 
                        href={`/dashboard/book?client=${client.id}`}
                        className="text-secondary hover:underline text-sm"
                      >
                        Book Trip
                      </Link>
                      <Link 
                        href={`/dashboard/clients/${client.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View
                      </Link>
                      <Link 
                        href={`/dashboard/clients/${client.id}/edit`}
                        className="text-primary hover:underline text-sm"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}