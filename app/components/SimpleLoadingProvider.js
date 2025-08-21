'use client';

import { createContext, useContext, useState } from 'react';

const LoadingContext = createContext();

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    // Return a no-op implementation if not wrapped
    return {
      showLoading: () => {},
      hideLoading: () => {},
      isLoading: false
    };
  }
  return context;
}

export default function SimpleLoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);

  const showLoading = () => {
    setIsLoading(true);
    // Auto-hide after 3 seconds to prevent stuck loading states
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      {/* Simple loading indicator that doesn't block navigation */}
      {isLoading && (
        <div className="fixed top-4 right-4 z-10 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#7CCFD0]"></div>
            <span className="text-sm text-gray-700">Loading...</span>
          </div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}
