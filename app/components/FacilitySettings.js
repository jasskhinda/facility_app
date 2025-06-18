'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function FacilitySettings() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [facility, setFacility] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    async function loadFacility() {
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
        
        // Check if user is a facility user
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, facility_id')
          .eq('id', currentSession.user.id)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        if (profileData.role !== 'facility') {
          router.push('/dashboard');
          return;
        }
        
        if (!profileData.facility_id) {
          throw new Error('No facility associated with this account');
        }
        
        // Load facility data
        const { data: facilityData, error: facilityError } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', profileData.facility_id)
          .single();
          
        if (facilityError) {
          throw facilityError;
        }
        
        setFacility(facilityData);
      } catch (err) {
        console.error('Error loading facility:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadFacility();
  }, [router, supabase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFacility((prev) => ({
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
      
      const { error } = await supabase
        .from('facilities')
        .update({
          name: facility.name,
          address: facility.address,
          phone_number: facility.phone_number,
          contact_email: facility.contact_email,
          billing_email: facility.billing_email,
          facility_type: facility.facility_type,
        })
        .eq('id', facility.id);
      
      if (error) {
        throw error;
      }
      
      setMessage('Facility settings updated successfully');
    } catch (err) {
      console.error('Error updating facility:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading facility information...</div>;
  }

  if (error && !facility) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Facility Settings</h1>
      
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
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">
              Facility Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={facility?.name || ''}
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
              value={facility?.address || ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows="3"
              required
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
              value={facility?.phone_number || ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label htmlFor="contact_email" className="block mb-1 font-medium">
              Contact Email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              value={facility?.contact_email || ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label htmlFor="billing_email" className="block mb-1 font-medium">
              Billing Email
            </label>
            <input
              id="billing_email"
              name="billing_email"
              type="email"
              value={facility?.billing_email || ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label htmlFor="facility_type" className="block mb-1 font-medium">
              Facility Type
            </label>
            <select
              id="facility_type"
              name="facility_type"
              value={facility?.facility_type || ''}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Facility Type</option>
              <option value="hospital">Hospital</option>
              <option value="nursing_home">Nursing Home</option>
              <option value="rehabilitation_center">Rehabilitation Center</option>
              <option value="assisted_living">Assisted Living</option>
              <option value="dialysis_center">Dialysis Center</option>
              <option value="outpatient_clinic">Outpatient Clinic</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-onPrimary font-medium rounded"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}