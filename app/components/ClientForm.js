'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function ClientForm({ clientId = null }) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facilityId, setFacilityId] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [session, setSession] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    accessibility_needs: '',
    medical_requirements: '',
    emergency_contact: '',
  });

  useEffect(() => {
    async function initialize() {
      try {
        console.log('ClientForm: Starting initialization...');
        
        // Get session
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        console.log('ClientForm: Session check:', { hasSession: !!currentSession, sessionError });
        
        if (sessionError) {
          console.error('ClientForm: Session error:', sessionError);
          setError('Authentication error. Please try logging in again.');
          setLoading(false);
          return;
        }
        
        setSession(currentSession);
        
        if (!currentSession?.user) {
          console.log('ClientForm: No session, redirecting to login');
          router.push('/login');
          return;
        }
        
        setLoading(true);
        setError(null);
        
        // Check if user is a facility admin
        console.log('ClientForm: Checking user profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', currentSession.user.id)
          .single();
          
        console.log('ClientForm: Profile check:', { profile, profileError });
          
        if (profileError) {
          console.error('ClientForm: Profile error:', profileError);
          throw profileError;
        }
        
        if (profile.role !== 'facility') {
          console.log('ClientForm: Not a facility user, redirecting');
          router.push('/dashboard');
          return;
        }
        
        if (!profile.facility_id) {
          console.log('ClientForm: No facility_id found');
          setError('No facility associated with this account');
          setLoading(false);
          return;
        }
        
        console.log('ClientForm: Setting facility_id:', profile.facility_id);
        setFacilityId(profile.facility_id);
        
        // If editing an existing client, load their data
        if (clientId) {
          const response = await fetch(`/api/facility/clients/${clientId}`);
          const result = await response.json();
          
          if (!response.ok) {
            setError(result.error || 'Failed to load client data');
            setLoading(false);
            return;
          }
          
          const client = result.client;
          setFormData({
            first_name: client.first_name || '',
            last_name: client.last_name || '',
            email: client.email || '',
            phone_number: client.phone_number || '',
            address: client.address || '',
            accessibility_needs: client.accessibility_needs || '',
            medical_requirements: client.medical_requirements || '',
            emergency_contact: client.emergency_contact || '',
          });
        }
        
        console.log('ClientForm: Initialization complete');
        setLoading(false);
      } catch (err) {
        console.error('ClientForm: Error initializing:', err);
        setError(err.message || 'Failed to initialize form');
        setLoading(false);
      }
    }
    
    // Add a timeout safety net to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.error('ClientForm: Initialization timeout - clearing loading state');
        setLoading(false);
        setError('Form initialization timed out. Please refresh the page.');
      }
    }, 15000); // 15 seconds timeout
    
    initialize().finally(() => {
      clearTimeout(timeoutId);
    });
    
    return () => clearTimeout(timeoutId);
  }, [router, supabase, clientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      
      if (!facilityId) {
        throw new Error('Facility ID not found');
      }
      
      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.email) {
        throw new Error('First name, last name, and email are required');
      }
      
      // If editing an existing client
      if (clientId) {
        console.log('Updating client with data:', formData);
        
        const response = await fetch(`/api/facility/clients/${clientId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone_number: formData.phone_number,
            address: formData.address,
            accessibility_needs: formData.accessibility_needs,
            medical_requirements: formData.medical_requirements,
            emergency_contact: formData.emergency_contact,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'Failed to update client');
          } catch (parseError) {
            throw new Error(`Failed to update client: ${response.status} ${response.statusText}`);
          }
        }

        const result = await response.json();
        console.log('Update API Success:', result);
        setMessage('Client updated successfully');
        
        // Wait a moment before redirecting to let the user see the success message
        setTimeout(() => {
          router.push('/dashboard/clients');
        }, 1500);
      } 
      // Creating a new client
      else {
        console.log('Creating new client with data:', formData);
        
        // Use the API endpoint to create the client
        const response = await fetch('/api/facility/clients', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email,
            phone_number: formData.phone_number,
            address: formData.address,
            accessibility_needs: formData.accessibility_needs,
            medical_requirements: formData.medical_requirements,
            emergency_contact: formData.emergency_contact,
          }),
        });

        console.log('API Response status:', response.status);
        console.log('API Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.error || 'Failed to create client');
          } catch (parseError) {
            throw new Error(`Failed to create client: ${response.status} ${response.statusText}`);
          }
        }

        const result = await response.json();
        console.log('API Success:', result);
        setMessage('Client added successfully');
        
        // Wait a moment before redirecting to let the user see the success message
        setTimeout(() => {
          router.push('/dashboard/clients');
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving client:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#7CCFD0] mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading form...</p>
        </div>
      </div>
    );
  }

  const formTitle = clientId ? 'Edit Client' : 'Add New Client';

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">{formTitle}</h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {message && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block mb-1 font-medium text-gray-900">
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="last_name" className="block mb-1 font-medium text-gray-900">
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="email" className="block mb-1 font-medium text-gray-900">
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              required
            />
            <p className="text-sm text-gray-600 mt-1">
              Required to create client account and send login credentials
            </p>
          </div>
          
          <div>
            <label htmlFor="phone_number" className="block mb-1 font-medium text-gray-900">
              Phone Number
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="address" className="block mb-1 font-medium text-gray-900">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              rows="3"
              required
            />
          </div>
          
          <div>
            <label htmlFor="accessibility_needs" className="block mb-1 font-medium text-gray-900">
              Accessibility Needs
            </label>
            <textarea
              id="accessibility_needs"
              name="accessibility_needs"
              value={formData.accessibility_needs}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              rows="2"
            />
          </div>
          
          <div>
            <label htmlFor="medical_requirements" className="block mb-1 font-medium text-gray-900">
              Medical Requirements
            </label>
            <textarea
              id="medical_requirements"
              name="medical_requirements"
              value={formData.medical_requirements}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
              rows="2"
            />
          </div>
          
          <div>
            <label htmlFor="emergency_contact" className="block mb-1 font-medium text-gray-900">
              Emergency Contact
            </label>
            <input
              id="emergency_contact"
              name="emergency_contact"
              type="text"
              value={formData.emergency_contact}
              onChange={handleChange}
              className="w-full p-2 border rounded text-gray-900 placeholder-gray-500"
            />
          </div>
          
          <div className="pt-6 flex justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard/clients')}
              className="inline-flex items-center px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors border-2 border-red-500 hover:border-red-600"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors border-2 border-green-500 hover:border-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <>
                  <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {clientId ? 'Update Client' : 'Add Client'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}