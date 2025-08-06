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

  // Route change loading
  useEffect(() => {
    let timeoutId;
    let globalTimeoutId;
    
    // Force clear loading state when pathname changes
    setIsLoading(false);
    
    const handleStart = () => {
      setLoadingMessage('Navigating...');
      setIsLoading(true);
      
      // Auto-hide after 800ms for route changes (faster for better UX)
      timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      
      // Global timeout protection - force hide after 3 seconds maximum
      globalTimeoutId = setTimeout(() => {
        console.warn('🚨 Global navigation timeout reached, forcing hide');
        setIsLoading(false);
      }, 3000);
    };

    const handleComplete = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
      }
      setIsLoading(false);
    };

    // Listen for popstate events (back/forward navigation)
    const handlePopState = () => {
      handleStart();
    };

    // Override Next.js router push/replace to show loading
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;

    if (originalPush) {
      window.history.pushState = function(...args) {
        handleStart();
        return originalPush.apply(this, args);
      };
    }

    if (originalReplace) {
      window.history.replaceState = function(...args) {
        handleStart();
        return originalReplace.apply(this, args);
      };
    }

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (globalTimeoutId) {
        clearTimeout(globalTimeoutId);
      }
      // Restore original methods
      if (originalPush) {
        window.history.pushState = originalPush;
      }
      if (originalReplace) {
        window.history.replaceState = originalReplace;
      }
    };
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