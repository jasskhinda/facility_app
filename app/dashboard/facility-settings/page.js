'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import FacilitySettings from '@/app/components/FacilitySettings';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function FacilitySettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          window.location.href = '/login';
          return;
        }
        
        // Get user profile to check role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) throw profileError;
        
        // If not a facility user, redirect to dashboard
        if (profile.role !== 'facility') {
          window.location.href = '/dashboard';
          return;
        }
        
        setUser(session.user);
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <DashboardLayout user={user} activeTab="settings">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Facility Settings</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <FacilitySettings />
        </div>
      </div>
    </DashboardLayout>
  );
}