'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import BookingForm from '@/app/components/BookingForm';
import FacilityBookingForm from '@/app/components/FacilityBookingForm';

export default function BookRide() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          return;
        }
        
        setUser(session.user);
        
        // Get user role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) throw profileError;
        setUserRole(profile.role);
      } catch (error) {
        console.error('Error getting user:', error);
        router.push('/login?error=server_error');
      } finally {
        setLoading(false);
      }
    }
    
    getUser();
  }, [supabase, router]);

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

  // Render the appropriate booking form based on user role
  return userRole === 'facility' 
    ? <FacilityBookingForm user={user} />
    : <BookingForm user={user} />;
}