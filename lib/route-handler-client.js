import { createRouteHandlerClient as createRouteHandlerClientAuth } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  
  // Debug: Log available cookies
  console.log('Available cookies:', cookieStore.getAll().map(c => ({ name: c.name, hasValue: !!c.value })));
  
  return createRouteHandlerClientAuth({ 
    cookies: () => cookieStore,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}