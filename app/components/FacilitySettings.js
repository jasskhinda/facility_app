'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import FacilityUserManagement from './FacilityUserManagement';
import ContractViewer from './ContractViewer';
import PasswordChange from './PasswordChange';

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
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('facility');

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
        
        // Check if user is a facility user - now check facility_users table
        const { data: facilityUserData, error: facilityUserError } = await supabase
          .from('facility_users')
          .select('role, facility_id')
          .eq('user_id', currentSession.user.id)
          .eq('status', 'active')
          .single();
          
        let profileData = null;
        let facilityId = null;
        
        if (facilityUserError) {
          // Fallback to old profiles table for backward compatibility
          const { data: profileDataResult, error: profileError } = await supabase
            .from('profiles')
            .select('role, facility_id')
            .eq('id', currentSession.user.id)
            .single();
            
          profileData = profileDataResult;
            
          if (profileError || !profileData || profileData.role !== 'facility') {
            router.push('/dashboard');
            return;
          }
          
          if (!profileData.facility_id) {
            throw new Error('No facility associated with this account');
          }
          
          setUserRole('super_admin'); // Default for legacy users
          facilityId = profileData.facility_id;
        } else {
          setUserRole(facilityUserData.role);
          facilityId = facilityUserData.facility_id;
        }
        if (!facilityId) {
          throw new Error('No facility associated with this account');
        }
        
        // Load facility data
        console.log('🏢 Loading facility data for ID:', facilityId);
        const { data: facilityData, error: facilityError } = await supabase
          .from('facilities')
          .select('*')
          .eq('id', facilityId)
          .single();
          
        if (facilityError) {
          console.error('❌ Error loading facility:', facilityError);
          if (facilityError.code === 'PGRST116') {
            throw new Error('Facility not found. Please contact support to set up your facility.');
          } else {
            throw new Error(`Failed to load facility: ${facilityError.message}`);
          }
        }
        
        if (!facilityData) {
          throw new Error('Facility data not found. Please contact support.');
        }
        
        console.log('✅ Facility data loaded:', facilityData);
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

  const tabs = [
    { id: 'facility', label: 'Facility Info', icon: '🏥' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'contracts', label: 'Contracts', icon: '📋' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'password', label: 'Change Password', icon: '🔑' }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#7CCFD0] text-[#7CCFD0]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {/* Facility Information Tab */}
          {activeTab === 'facility' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-900">Facility Information</h2>
              
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
                    <label htmlFor="name" className="block mb-1 font-medium text-gray-900">
                      Facility Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={facility?.name || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                      required
                      disabled={!['super_admin', 'admin'].includes(userRole)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="address" className="block mb-1 font-medium text-gray-900">
                      Address
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      value={facility?.address || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                      rows="3"
                      required
                      disabled={!['super_admin', 'admin'].includes(userRole)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone_number" className="block mb-1 font-medium text-gray-900">
                      Phone Number
                    </label>
                    <input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      value={facility?.phone_number || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                      disabled={!['super_admin', 'admin'].includes(userRole)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="contact_email" className="block mb-1 font-medium text-gray-900">
                      Contact Email
                    </label>
                    <input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      value={facility?.contact_email || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                      disabled={!['super_admin', 'admin'].includes(userRole)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="billing_email" className="block mb-1 font-medium text-gray-900">
                      Billing Email
                    </label>
                    <input
                      id="billing_email"
                      name="billing_email"
                      type="email"
                      value={facility?.billing_email || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                      disabled={!['super_admin', 'admin'].includes(userRole)}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="facility_type" className="block mb-1 font-medium text-gray-900">
                      Facility Type
                    </label>
                    <select
                      id="facility_type"
                      name="facility_type"
                      value={facility?.facility_type || ''}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:border-[#7CCFD0] focus:ring-1 focus:ring-[#7CCFD0] outline-none"
                      disabled={!['super_admin', 'admin'].includes(userRole)}
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
                  
                  {['super_admin', 'admin'].includes(userRole) && (
                    <div className="pt-4">
                      <button
                        type="submit"
                        className="bg-[#7CCFD0] hover:bg-[#60BFC0] text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  )}
                  
                  {userRole === 'scheduler' && (
                    <div className="pt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Only facility administrators can modify facility information. 
                        Contact your facility admin if changes are needed.
                      </p>
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}
          
          {/* User Management Tab */}
          {activeTab === 'users' && (
            <FacilityUserManagement 
              user={session?.user} 
              facilityId={facility?.id}
            />
          )}
          
          {/* Contracts Tab */}
          {activeTab === 'contracts' && (
            <ContractViewer 
              user={session?.user} 
              facilityId={facility?.id}
              userRole={userRole}
            />
          )}
          
          {/* Security Tab */}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-gray-900">Account Security</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Password</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Update your password to keep your account secure. You'll need to sign in again after changing your password.
                  </p>
                  <button
                    onClick={() => setActiveTab('password')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-900 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7CCFD0] transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Update Password
                  </button>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Account Information</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Email:</strong> {session?.user?.email || 'Not available'}</p>
                    <p><strong>Role:</strong> {userRole ? userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not available'}</p>
                    <p><strong>Account ID:</strong> {session?.user?.id?.substring(0, 8)}...</p>
                    <p><strong>Last Sign In:</strong> {session?.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleDateString() : 'Not available'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Password Change Tab */}
          {activeTab === 'password' && (
            <PasswordChange user={session?.user} />
          )}
        </div>
      </div>
    </div>
  );
}