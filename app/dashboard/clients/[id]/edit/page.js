'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import ClientForm from '@/app/components/ClientForm';
import DashboardLayout from '@/app/components/DashboardLayout';

export default function EditClientPage() {
  const params = useParams();
  const clientId = params.id;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const supabase = createClientComponentClient();

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
          .select('role, facility_id')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) throw profileError;
        
        // If not a facility user, redirect to dashboard
        if (profile.role !== 'facility') {
          window.location.href = '/dashboard';
          return;
        }
        
        // Verify that the client belongs to this facility
        if (clientId) {
          const { data: client, error: clientError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', clientId)
            .eq('facility_id', profile.facility_id)
            .single();
            
          if (clientError) {
            setError('Client not found or does not belong to your facility');
            setLoading(false);
            return;
          }
        }
        
        setUser(session.user);
      } catch (error) {
        console.error('Error getting user:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, [supabase, clientId]);

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

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <DashboardLayout user={user} activeTab="clients">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Edit Client</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-4">
          <ClientForm clientId={clientId} />
        </div>
      </div>
    </DashboardLayout>
  );
}