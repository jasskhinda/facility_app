'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Check for error query parameter on page load
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');
    const freshLogin = searchParams.get('fresh') === 'true';
    const wasLoggedOut = searchParams.get('logout') === 'true';
    
    // If this is a fresh login after signout or a logout, clear any existing session
    if (freshLogin || wasLoggedOut) {
      // Clear session to prevent redirect loops
      supabase.auth.signOut().catch(err => 
        console.error('Error clearing session on login page load:', err)
      );
    }
    
    if (errorParam === 'access_denied') {
      setError('Access denied. You do not have permission to access this application.');
    } else if (errorParam === 'server_error') {
      setError('Server error. Please try again later.');
    }
  }, [supabase.auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Attempting login with:', { email });
      
      // Sign in with Supabase - email confirmation is now disabled in settings
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // For refresh token errors, still proceed with login
        if (error.message && error.message.includes('Refresh Token Not Found')) {
          console.log('Ignoring refresh token error during login');
        } else {
          throw error;
        }
      }
      
      // Successfully logged in
      console.log('Login successful, session:', data.session ? 'exists' : 'none');
      
      // Explicitly refresh the page instead of using router.push
      // This ensures cookies are properly sent in the next request
      window.location.href = '/dashboard';
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Don't show refresh token errors to the user, as they're likely harmless
      if (error.message && error.message.includes('Refresh Token Not Found')) {
        console.log('Ignoring refresh token error and proceeding with redirect');
        // Still try to redirect to dashboard
        window.location.href = '/dashboard';
        return;
      }
      
      setError(error.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#2E4F54] text-gray-900">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md shadow-sm focus:outline-none focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
          />
        </div>
        
        <div>
          <div className="flex justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-[#2E4F54] text-gray-900">
              Password
            </label>
            <button 
              type="button"
              onClick={() => router.push('/reset-password')}
              className="text-sm font-medium text-[#7CCFD0] hover:text-[#60BFC0]">
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mt-1"
          />
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#7CCFD0] hover:bg-[#60BFC0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7CCFD0] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
        

      </div>
    </form>
  );
}