'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import ContractManager from './ContractManager';

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
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* Facility Settings Section */}
      <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63] p-6">
        <h2 className="text-xl font-semibold mb-6 text-[#2E4F54] dark:text-[#E0F4F5]">Facility Information</h2>
        
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
              <label htmlFor="name" className="block mb-1 font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Facility Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={facility?.name || ''}
                onChange={handleChange}
                className="w-full p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                required
              />
            </div>
            
            <div>
              <label htmlFor="address" className="block mb-1 font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={facility?.address || ''}
                onChange={handleChange}
                className="w-full p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                rows="3"
                required
              />
            </div>
            
            <div>
              <label htmlFor="phone_number" className="block mb-1 font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Phone Number
              </label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                value={facility?.phone_number || ''}
                onChange={handleChange}
                className="w-full p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
              />
            </div>
            
            <div>
              <label htmlFor="contact_email" className="block mb-1 font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Contact Email
              </label>
              <input
                id="contact_email"
                name="contact_email"
                type="email"
                value={facility?.contact_email || ''}
                onChange={handleChange}
                className="w-full p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
              />
            </div>
            
            <div>
              <label htmlFor="billing_email" className="block mb-1 font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Billing Email
              </label>
              <input
                id="billing_email"
                name="billing_email"
                type="email"
                value={facility?.billing_email || ''}
                onChange={handleChange}
                className="w-full p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
              />
            </div>
            
            <div>
              <label htmlFor="facility_type" className="block mb-1 font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Facility Type
              </label>
              <select
                id="facility_type"
                name="facility_type"
                value={facility?.facility_type || ''}
                onChange={handleChange}
                className="w-full p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
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
                className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Contract Management Section */}
      <div className="bg-white dark:bg-[#1C2C2F] rounded-lg shadow-sm border border-[#DDE5E7] dark:border-[#3F5E63]">
        <div className="p-6 border-b border-[#DDE5E7] dark:border-[#3F5E63]">
          <h2 className="text-xl font-semibold text-[#2E4F54] dark:text-[#E0F4F5]">Contract Management</h2>
          <p className="text-sm text-[#2E4F54]/70 dark:text-[#E0F4F5]/70 mt-1">
            Upload and manage your facility's transportation service contract
          </p>
        </div>
        <div className="p-6">
          <ContractManager facilityId={facility?.id} />
        </div>
      </div>
    </div>
  );
}