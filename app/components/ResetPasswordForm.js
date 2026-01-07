'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // Try Supabase built-in reset first
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (supabaseError) {
        console.log('Supabase reset failed, trying custom SMTP:', supabaseError.message);

        // Fallback to custom SMTP API
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send reset email');
        }

        setMessage(data.message || 'If an account exists with this email, a password reset link will be sent.');
        setEmail('');
        return;
      }

      // Supabase succeeded
      setMessage('Check your email for a password reset link.');
      setEmail('');

    } catch (error) {
      console.error('Reset password error:', error);
      setError(error.message || 'Error sending recovery email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#2E4F54] text-gray-900 mb-2">
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
          className="w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
          placeholder="Enter your email address"
        />
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
              Sending...
            </span>
          ) : 'Send reset link'}
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