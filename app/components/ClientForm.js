'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ClientForm({ clientId = null }) {
  const supabase = createClientComponentClient();
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
  const [createAccount, setCreateAccount] = useState(false);

  useEffect(() => {
    async function initialize() {
      // Get session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      
      if (!currentSession?.user) {
        router.push('/login');
        return;
      }
      try {
        setLoading(true);
        setError(null);
        
        // Check if user is a facility admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', currentSession.user.id)
          .single();
          
        if (profileError) throw profileError;
        
        if (profile.role !== 'facility') {
          router.push('/dashboard');
          return;
        }
        
        if (!profile.facility_id) {
          setError('No facility associated with this account');
          setLoading(false);
          return;
        }
        
        setFacilityId(profile.facility_id);
        
        // If editing an existing client, load their data
        if (clientId) {
          const { data: client, error: clientError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', clientId)
            .eq('facility_id', profile.facility_id)
            .single();
            
          if (clientError) throw clientError;
          
          if (!client) {
            setError('Client not found or not associated with your facility');
            setLoading(false);
            return;
          }
          
          setFormData({
            first_name: client.first_name || '',
            last_name: client.last_name || '',
            email: '', // Email can't be fetched from profiles table directly
            phone_number: client.phone_number || '',
            address: client.address || '',
            accessibility_needs: client.accessibility_needs || '',
            medical_requirements: client.medical_requirements || '',
            emergency_contact: client.emergency_contact || '',
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error initializing client form:', err);
        setError(err.message);
        setLoading(false);
      }
    }
    
    initialize();
  }, [router, supabase, clientId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e) => {
    const { checked } = e.target;
    setCreateAccount(checked);
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
      
      // If editing an existing client
      if (clientId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone_number: formData.phone_number,
            address: formData.address,
            accessibility_needs: formData.accessibility_needs,
            medical_requirements: formData.medical_requirements,
            emergency_contact: formData.emergency_contact,
          })
          .eq('id', clientId);
          
        if (updateError) throw updateError;
        
        setMessage('Client updated successfully');
        router.push('/dashboard/clients');
      } 
      // Creating a new client
      else {
        if (createAccount && formData.email) {
          // This would call an API endpoint to create a new user and send an invitation
          // Since we can't directly create auth.users, we'd need a server API endpoint
          // For now, just show a message
          setMessage('Account creation would be handled by an API endpoint');
          router.push('/dashboard/clients');
        } else {
          // Create a profile entry without an auth user
          // This would be for tracking clients who don't need system access
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              // In a real implementation, you'd generate a UUID here or have the API do it
              id: crypto.randomUUID(), // This is just for demonstration
              first_name: formData.first_name,
              last_name: formData.last_name,
              phone_number: formData.phone_number,
              address: formData.address,
              accessibility_needs: formData.accessibility_needs,
              medical_requirements: formData.medical_requirements,
              emergency_contact: formData.emergency_contact,
              facility_id: facilityId,
              role: 'client',
            });
            
          if (insertError) throw insertError;
          
          setMessage('Client added successfully');
          router.push('/dashboard/clients');
        }
      }
    } catch (err) {
      console.error('Error saving client:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  const formTitle = clientId ? 'Edit Client' : 'Add New Client';

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{formTitle}</h1>
      
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
              <label htmlFor="first_name" className="block mb-1 font-medium">
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label htmlFor="last_name" className="block mb-1 font-medium">
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label htmlFor="phone_number" className="block mb-1 font-medium">
              Phone Number
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label htmlFor="address" className="block mb-1 font-medium">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="3"
              required
            />
          </div>
          
          <div>
            <label htmlFor="accessibility_needs" className="block mb-1 font-medium">
              Accessibility Needs
            </label>
            <textarea
              id="accessibility_needs"
              name="accessibility_needs"
              value={formData.accessibility_needs}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="2"
            />
          </div>
          
          <div>
            <label htmlFor="medical_requirements" className="block mb-1 font-medium">
              Medical Requirements
            </label>
            <textarea
              id="medical_requirements"
              name="medical_requirements"
              value={formData.medical_requirements}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="2"
            />
          </div>
          
          <div>
            <label htmlFor="emergency_contact" className="block mb-1 font-medium">
              Emergency Contact
            </label>
            <input
              id="emergency_contact"
              name="emergency_contact"
              type="text"
              value={formData.emergency_contact}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          {!clientId && (
            <div className="flex items-center">
              <input
                id="create_account"
                type="checkbox"
                checked={createAccount}
                onChange={handleCheckboxChange}
                className="mr-2"
              />
              <label htmlFor="create_account">
                Create account for this client
              </label>
            </div>
          )}
          
          <div className="pt-4 flex justify-between">
            <button
              type="button"
              onClick={() => router.push('/dashboard/clients')}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-onPrimary font-medium rounded"
              disabled={saving}
            >
              {saving ? 'Saving...' : (clientId ? 'Update Client' : 'Add Client')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}