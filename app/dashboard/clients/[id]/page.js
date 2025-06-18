'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/client-supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id;
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) throw profileError;
        
        // If not a facility user, redirect to dashboard
        if (profile.role !== 'facility') {
          router.push('/dashboard');
          return;
        }
        
        setUser(session.user);
        
        // Load client details
        const { data: clientData, error: clientError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', clientId)
          .eq('facility_id', profile.facility_id)
          .single();
          
        if (clientError) {
          if (clientError.code === 'PGRST116') {
            setError('Client not found or not associated with your facility');
          } else {
            setError(clientError.message);
          }
          setLoading(false);
          return;
        }
        
        setClient(clientData);
        
        // Load client trips
        const { data: tripsData, error: tripsError } = await supabase
          .from('trips')
          .select('*')
          .eq('user_id', clientId)
          .order('pickup_time', { ascending: false });
          
        if (tripsError) throw tripsError;
        
        setTrips(tripsData || []);
      } catch (error) {
        console.error('Error loading client data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [supabase, clientId, router]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getTripStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <DashboardLayout user={user} activeTab="clients">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded">
              {error}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout user={user} activeTab="clients">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 p-4 rounded">
              Client not found
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="clients">
      <div className="py-6 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Client Details Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {client.full_name || `${client.first_name} ${client.last_name}`}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Client Profile</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-3">
            <Link 
              href={`/dashboard/book?client=${client.id}`}
              className="px-4 py-2 bg-secondary text-onSecondary rounded-md font-medium"
            >
              Book Trip
            </Link>
            <Link 
              href={`/dashboard/clients/${client.id}/edit`}
              className="px-4 py-2 bg-primary text-onPrimary rounded-md font-medium"
            >
              Edit Client
            </Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-surface rounded-lg shadow overflow-hidden mb-8">
          <div className="px-4 py-5 sm:px-6 bg-[#F8F9FA] dark:bg-[#24393C] border-b border-[#DDE5E7] dark:border-[#3F5E63]">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Client Information</h3>
          </div>
          <div className="px-4 py-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Information</h4>
              <div className="mt-2 space-y-2">
                <p className="text-gray-900 dark:text-white">{client.phone_number || 'No phone number'}</p>
                <p className="text-gray-600 dark:text-gray-300">{client.address || 'No address'}</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Medical & Accessibility</h4>
              <div className="mt-2 space-y-2">
                <p className="text-gray-900 dark:text-white">
                  <span className="font-medium">Accessibility Needs:</span> {client.accessibility_needs || 'None specified'}
                </p>
                <p className="text-gray-900 dark:text-white">
                  <span className="font-medium">Medical Requirements:</span> {client.medical_requirements || 'None specified'}
                </p>
              </div>
            </div>
            
            {client.emergency_contact && (
              <div className="col-span-1 md:col-span-2">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Emergency Contact</h4>
                <p className="mt-2 text-gray-900 dark:text-white">{client.emergency_contact}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Client Trips */}
        <div className="bg-white dark:bg-surface rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-[#F8F9FA] dark:bg-[#24393C] border-b border-[#DDE5E7] dark:border-[#3F5E63] flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Trip History</h3>
            <Link 
              href={`/dashboard/book?client=${client.id}`}
              className="text-primary dark:text-secondary text-sm hover:underline"
            >
              Book New Trip
            </Link>
          </div>
          
          {trips.length === 0 ? (
            <div className="px-4 py-10 sm:p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No trips found for this client</p>
              <Link 
                href={`/dashboard/book?client=${client.id}`}
                className="mt-4 inline-block px-4 py-2 bg-primary text-onPrimary rounded-md font-medium"
              >
                Book Their First Trip
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#DDE5E7] dark:divide-[#3F5E63]">
                <thead className="bg-[#F8F9FA] dark:bg-[#24393C]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pickup
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-surface divide-y divide-[#DDE5E7] dark:divide-[#3F5E63]">
                  {trips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-[#F8F9FA] dark:hover:bg-[#24393C]/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDate(trip.pickup_time)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-[180px] truncate">
                        {trip.pickup_address}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-[180px] truncate">
                        {trip.destination_address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTripStatusClass(trip.status)}`}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {trip.price ? `$${trip.price}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          href={`/dashboard/trips/${trip.id}`}
                          className="text-primary dark:text-secondary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}