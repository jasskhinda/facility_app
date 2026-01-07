'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [useCustomToken, setUseCustomToken] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [tokenEmail, setTokenEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    const checkSession = async () => {
      // Check for custom token first (from our SMTP flow)
      const token = searchParams.get('token');
      const email = searchParams.get('email');

      if (token && email) {
        setUseCustomToken(true);
        setCustomToken(token);
        setTokenEmail(email);
        setIsCheckingToken(false);
        return;
      }

      // Check for Supabase session (from Supabase's reset flow)
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);

      if (!data.session) {
        // If no active session and not in a recovery flow, redirect to login
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.has('code') && !urlParams.has('token')) {
          router.push('/login');
        }
      }
      setIsCheckingToken(false);
    };

    checkSession();
  }, [router, searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      if (useCustomToken) {
        // Use custom token flow
        const response = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: customToken,
            email: tokenEmail,
            newPassword: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update password');
        }

        setMessage('Your password has been updated successfully. Redirecting to login...');
        setPassword('');
        setConfirmPassword('');

        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        // Use Supabase flow
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) {
          throw error;
        }

        setMessage('Your password has been updated successfully.');
        setPassword('');
        setConfirmPassword('');

        // Refresh the session to ensure clean state and redirect to dashboard
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            router.replace('/dashboard');
          } else {
            router.push('/login');
          }
        }, 1500);
      }

    } catch (error) {
      console.error('Update password error:', error);
      setError(error.message || 'An error occurred while updating your password.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingToken) {
    return (
      <div className="flex justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-[#7CCFD0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          {error}
        </div>
      )}
      
      {message && (
        <div className="p-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          {message}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
            placeholder="Enter your new password"
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
            placeholder="Confirm your new password"
          />
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#7CCFD0] hover:bg-[#60BFC0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7CCFD0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </span>
          ) : 'Update password'}
        </button>
        
        <div className="text-center">
          <a 
            href="/login" 
            className="text-sm font-medium text-[#7CCFD0] hover:text-[#60BFC0] transition-colors"
          >
            Back to login
          </a>
        </div>
      </div>
    </form>
  );
}