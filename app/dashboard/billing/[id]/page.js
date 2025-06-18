import { createServerClient } from '@/lib/server-supabase';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import InvoiceDetail from '@/app/components/InvoiceDetail';

export default async function InvoiceDetailPage({ params }) {
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

  return (
    <DashboardLayout user={session.user} activeTab="billing">
      <InvoiceDetail invoiceId={params.id} />
    </DashboardLayout>
  );
}