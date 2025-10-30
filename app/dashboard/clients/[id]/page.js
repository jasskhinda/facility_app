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

        // Allow facility staff (facility owner, admin, scheduler) to view clients
        const allowedRoles = ['facility', 'super_admin', 'admin', 'scheduler'];
        if (!allowedRoles.includes(profile.role)) {
          router.push('/dashboard');
          return;
        }
        
        setUser(session.user);
        
        // Load client details using the API endpoint
        const response = await fetch(`/api/facility/clients/${clientId}`);
        const result = await response.json();
        
        if (!response.ok) {
          setError(result.error || 'Failed to load client data');
          setLoading(false);
          return;
        }
        
        setClient(result.client);
        setTrips(result.trips || []);
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
        return 'bg-green-500 text-white font-bold';
      case 'upcoming':
        return 'bg-blue-500 text-white font-bold';
      case 'pending':
        return 'bg-yellow-500 text-white font-bold';
      case 'cancelled':
        return 'bg-red-500 text-white font-bold';
      case 'in_progress':
        return 'bg-[#7CCFD0] text-white font-bold';
      default:
        return 'bg-gray-500 text-white font-bold';
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
        <div className="bg-white rounded-lg shadow-sm border border-[#DDE5E7] p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#2E4F54]">
                {client.full_name || `${client.first_name} ${client.last_name}`}
              </h1>
              <p className="text-lg text-[#2E4F54]/70 mt-2">Client Profile</p>
            </div>
            
            <div className="mt-4 md:mt-0 flex gap-3">
              <Link 
                href={`/dashboard/book?client=${client.id}`}
                className="inline-flex items-center px-6 py-3 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white font-semibold rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Trip
              </Link>
              <Link 
                href={`/dashboard/clients/${client.id}/edit`}
                className="inline-flex items-center px-6 py-3 bg-white border-2 border-[#7CCFD0] text-[#7CCFD0] hover:bg-[#7CCFD0] hover:text-white font-semibold rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Client
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-[#DDE5E7] overflow-hidden mb-8">
          <div className="px-6 py-4 bg-[#F8F9FA] border-b border-[#DDE5E7]">
            <h3 className="text-xl font-bold text-[#2E4F54]">Client Information</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-[#2E4F54] mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#7CCFD0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Contact Information
                </h4>
                <div className="space-y-3 pl-7">
                  <div className="flex items-center">
                    <span className="font-medium text-[#2E4F54] w-20">Email:</span>
                    <span className="text-[#2E4F54] font-semibold">{client.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium text-[#2E4F54] w-20">Phone:</span>
                    <span className="text-[#2E4F54] font-semibold">{client.phone_number || 'No phone number'}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="font-medium text-[#2E4F54] w-20 mt-1">Address:</span>
                    <span className="text-[#2E4F54]">{client.address || 'No address provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-[#2E4F54] mb-3 flex items-center">
                  👤
                  <span className="ml-2">Enhanced Client Information</span>
                </h4>
                <div className="space-y-3 pl-7">
                  <div className="flex items-center">
                    <span className="font-medium text-[#2E4F54] w-32">Weight:</span>
                    <span className="text-[#2E4F54] font-semibold">
                      {client.weight ? `${client.weight} lbs` : 'Not provided'}
                      {client.weight >= 400 && (
                        <span className="ml-2 text-xs text-red-700 font-bold bg-red-100 px-2 py-1 rounded">🚫 Cannot accommodate - Over 400 lbs</span>
                      )}
                      {client.weight >= 300 && client.weight < 400 && (
                        <span className="ml-2 text-xs text-amber-700 font-bold bg-amber-100 px-2 py-1 rounded">⚠️ Bariatric</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium text-[#2E4F54] w-32">Height:</span>
                    <span className="text-[#2E4F54] font-semibold">
                      {client.height_feet && client.height_inches !== null ?
                        `${client.height_feet}' ${client.height_inches}"` :
                        client.height_feet ? `${client.height_feet}' 0"` : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium text-[#2E4F54] w-32">Date of Birth:</span>
                    <span className="text-[#2E4F54] font-semibold">
                      {client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-[#2E4F54] mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#7CCFD0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Medical & Accessibility
                </h4>
                <div className="space-y-3 pl-7">
                  <div>
                    <span className="font-semibold text-[#2E4F54] block">Accessibility Needs:</span>
                    <span className="text-[#2E4F54] mt-1 block">{client.accessibility_needs || 'None specified'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#2E4F54] block">Medical Requirements:</span>
                    <span className="text-[#2E4F54] mt-1 block">{client.medical_requirements || 'None specified'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {client.emergency_contact && (
              <div className="col-span-1 md:col-span-2 pt-4 border-t border-[#DDE5E7]">
                <h4 className="text-lg font-semibold text-[#2E4F54] mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-[#7CCFD0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Emergency Contact
                </h4>
                <p className="text-[#2E4F54] font-semibold pl-7">{client.emergency_contact}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Client Trips */}
        <div className="bg-white rounded-lg shadow-sm border border-[#DDE5E7] overflow-hidden">
          <div className="px-6 py-4 bg-[#F8F9FA] border-b border-[#DDE5E7] flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#2E4F54] flex items-center">
              <svg className="w-6 h-6 mr-2 text-[#7CCFD0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Trip History
            </h3>
            <Link 
              href={`/dashboard/book?client=${client.id}`}
              className="inline-flex items-center px-4 py-2 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book New Trip
            </Link>
          </div>
          
          {trips.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-[#DDE5E7] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg text-[#2E4F54]/60 mb-4">No trips found for this client</p>
              <p className="text-[#2E4F54]/50 mb-6">This client hasn't booked any transportation services yet.</p>
              <Link 
                href={`/dashboard/book?client=${client.id}`}
                className="inline-flex items-center px-6 py-3 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white font-semibold rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Their First Trip
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#DDE5E7]">
                <thead className="bg-[#F8F9FA]">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#2E4F54] uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#2E4F54] uppercase tracking-wider">
                      Pickup Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#2E4F54] uppercase tracking-wider">
                      Destination
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#2E4F54] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-[#2E4F54] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-[#2E4F54] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#DDE5E7]">
                  {trips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-[#2E4F54]">
                          {formatDate(trip.pickup_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#2E4F54] max-w-[200px]">
                          {trip.pickup_address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[#2E4F54] max-w-[200px]">
                          {trip.destination_address}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs rounded-full ${getTripStatusClass(trip.status)}`}>
                          {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-[#2E4F54]">
                          {trip.price ? `$${parseFloat(trip.price).toFixed(2)}` : 'Pending'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link 
                          href={`/dashboard/trips/${trip.id}`}
                          className="inline-flex items-center px-3 py-1 bg-[#7CCFD0] hover:bg-[#60BFC0] text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
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