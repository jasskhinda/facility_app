'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LoadingScreen from './LoadingScreen';
import NavigationLoader from './NavigationLoader';

const LoadingContext = createContext();

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

export default function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const pathname = usePathname();
  
  // Initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Show loader for 2 seconds on initial load

    // Global timeout protection for initial load - force hide after 15 seconds maximum
    const globalTimeout = setTimeout(() => {
      console.warn('🚨 Global initial load timeout reached, forcing hide');
      setIsLoading(false);
    }, 15000);

    return () => {
      clearTimeout(timer);
      clearTimeout(globalTimeout);
    };
  }, []);

  // Route change loading - simplified to not interfere with navigation
  useEffect(() => {
    // Only force clear loading state when pathname changes, no other interference
    setIsLoading(false);
  }, [pathname]);

  const showLoading = (message = 'Loading...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      <LoadingScreen isLoading={isLoading} message={loadingMessage} />
      <NavigationLoader />
      {children}
    </LoadingContext.Provider>
  );
}