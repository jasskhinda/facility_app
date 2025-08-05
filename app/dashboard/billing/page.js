'use client';

import { useState, useEffect } from 'react';
import { createClientSupabase } from '@/lib/client-supabase';
import DashboardLayout from '@/app/components/DashboardLayout';
import FacilityBillingComponent from '@/app/components/NewBillingComponent';

export default function DashboardBillingPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabase = createClientSupabase();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      if (!session) {
        window.location.href = '/login';
        return;
      }

      setUser(session.user);

      // Get user profile with facility info
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role, facility_id, first_name, last_name')
        .eq('id', session.user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData.role !== 'facility' || !profileData.facility_id) {
        setError('Access denied. This page is only available for facility administrators.');
        return;
      }

      setProfile(profileData);
      console.log('🏥 Billing Page - Profile loaded:', {
        userId: session.user.id,
        role: profileData.role,
        facilityId: profileData.facility_id,
        name: `${profileData.first_name} ${profileData.last_name}`
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user} activeTab="billing">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7CCFD0]"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout user={user} activeTab="billing">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                  Access Error
                </h3>
                <p className="text-red-700 dark:text-red-300 mt-2">
                  {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="billing">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Monthly Billing & Invoices
          </h1>
          <p className="text-gray-700">
            Professional invoice management for {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Facility'}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            💳 Now supporting online payments and traditional billing methods
          </p>
        </div>

        {/* Billing Component */}
        <FacilityBillingComponent 
          user={user} 
          facilityId={profile?.facility_id} 
        />
      </div>
    </DashboardLayout>
  );
}