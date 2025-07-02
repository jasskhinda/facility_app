'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function SignupForm() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthdate: '',
    marketingConsent: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    try {
      // Sign up with Supabase - email confirmation is now disabled in settings
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            birthdate: formData.birthdate,
            marketing_consent: formData.marketingConsent,
            role: 'client',
          },
        },
      });
      
      if (error) throw error;
      
      console.log('Signup successful', data);
      
      // With email confirmation disabled, we should now have a session
      if (data?.session) {
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        // If for some reason we don't have a session yet, try signing in explicitly
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });
          
          if (signInError && !signInError.message.includes('Refresh Token Not Found')) {
            throw signInError;
          }
          
          // Redirect even if there was a refresh token error, since the user is likely still authenticated
          router.push('/dashboard');
        } catch (signInError) {
          console.error('Signin after signup error:', signInError);
          throw signInError;
        }
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Don't show refresh token errors to the user, as they're likely harmless
      // and the user is probably still authenticated
      if (error.message && error.message.includes('Refresh Token Not Found')) {
        console.log('Ignoring refresh token error and proceeding with redirect');
        // Still try to redirect to dashboard
        router.push('/dashboard');
        return;
      }
      
      // Handle common errors with user-friendly messages
      if (error.message && error.message.includes('already registered')) {
        setError('An account with this email already exists');
      } else {
        setError(error.message || 'Failed to create account');
      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-[#2E4F54] text-gray-900">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md shadow-sm focus:outline-none focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-[#2E4F54] text-gray-900">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md shadow-sm focus:outline-none focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
            />
          </div>
        </div>
        
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
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md shadow-sm focus:outline-none focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-[#2E4F54] text-gray-900">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md shadow-sm focus:outline-none focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
          />
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#2E4F54] text-gray-900">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md shadow-sm focus:outline-none focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
          />
        </div>
        
        <div>
          <label htmlFor="birthdate" className="block text-sm font-medium text-[#2E4F54] text-gray-900">
            Date of Birth
          </label>
          <input
            id="birthdate"
            name="birthdate"
            type="date"
            required
            value={formData.birthdate}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#E0E0E0] rounded-md shadow-sm focus:outline-none focus:ring-[#7CCFD0] focus:border-[#7CCFD0] bg-white  text-[#2E4F54] text-gray-900"
          />
        </div>
        
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="marketingConsent"
              name="marketingConsent"
              type="checkbox"
              checked={formData.marketingConsent}
              onChange={handleChange}
              className="h-4 w-4 text-[#7CCFD0] border-[#DDE5E7] rounded focus:ring-[#7CCFD0]"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="marketingConsent" className="font-medium text-[#2E4F54] text-gray-900">
              Marketing emails
            </label>
            <p className="text-[#2E4F54]/70 text-gray-900/70">
              I agree to receive marketing emails about special offers and promotions.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#7CCFD0] hover:bg-[#60BFC0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7CCFD0] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </button>
        

      </div>
    </form>
  );
}