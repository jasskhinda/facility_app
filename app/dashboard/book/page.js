import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/server-supabase';
import { cookies } from 'next/headers';
import StreamlinedBookingForm from '@/app/components/StreamlinedBookingForm';

export const dynamic = 'force-dynamic';

export default async function BookRide() {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Check if user is a facility staff member (facility, admin, or scheduler)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  const allowedRoles = ['facility', 'admin', 'scheduler'];
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/dashboard');
  }

  return <StreamlinedBookingForm user={session.user} />;
}