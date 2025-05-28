import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/app/components/DashboardLayout';
import BillingView from '@/app/components/BillingView';

export default async function BillingPage() {
  const supabase = createServerComponentClient({ cookies });
  
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">
            View monthly invoices, track payments, and analyze client billing
          </p>
        </div>
        
        <BillingView />
      </div>
    </DashboardLayout>
  );
}