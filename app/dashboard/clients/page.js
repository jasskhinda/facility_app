import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/server-supabase';
import { cookies } from 'next/headers';
import FacilityClientManagement from '@/app/components/FacilityClientManagement';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = createServerClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Check if user is a facility admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (profile?.role !== 'facility') {
    redirect('/dashboard');
  }

  return <FacilityClientManagement user={session.user} />;
}