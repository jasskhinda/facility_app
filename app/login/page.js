'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import LoginForm from '@/app/components/LoginForm';
import Link from 'next/link';

function LoginContent() {
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  useEffect(() => {
    // If user was logged out, ensure we clear the session
    const wasLoggedOut = searchParams.get('logout') === 'true';
    
    if (wasLoggedOut) {
      // Force signOut one more time to ensure cookies are cleared
      supabase.auth.signOut()
        .then(() => {
          // Add the logout parameter to the URL without triggering a navigation
          const url = new URL(window.location);
          url.searchParams.set('logout', 'true');
          window.history.replaceState({}, '', url);
        })
        .catch(err => console.error('Error clearing session after logout:', err));
    }
  }, [searchParams, supabase.auth]);
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="p-4 bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900">Compassionate Care Transportation for Facilities</h1>
          </Link>
          <Link href="/" className="text-[#7CCFD0] hover:text-[#60BFC0] font-medium">
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🏥</div>
              <h2 className="text-2xl font-bold text-gray-900">
                Facility Portal Login
              </h2>
              <p className="mt-2 text-gray-600">
                Access your facility management dashboard
              </p>
            </div>
            
            <LoginForm />
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need access for your facility?
              </p>
              <Link href="/#contact" className="text-sm text-[#7CCFD0] hover:text-[#60BFC0] font-medium">
                Contact our sales team
              </Link>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-[#7CCFD0]/10 rounded-lg p-4 border border-[#7CCFD0]/20">
            <h3 className="font-semibold text-gray-900 mb-2">
              Facility Benefits:
            </h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Manage all client transportation in one place</li>
              <li>• Streamlined booking process for staff</li>
              <li>• Consolidated monthly billing</li>
              <li>• Real-time trip tracking and reports</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-sm text-gray-600">
        <p>© 2025 Compassionate Care Transportation. Facility Portal v1.0</p>
      </footer>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}