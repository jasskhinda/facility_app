'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen({ isLoading, message = "Loading..." }) {
  const [dots, setDots] = useState('');
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  // Animate dots
  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Show refresh button after 10 seconds of loading
  useEffect(() => {
    if (!isLoading) {
      setShowRefreshButton(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setShowRefreshButton(true);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      {/* Logo with pulse animation */}
      <div className="mb-8 animate-pulse">
        <img 
          src="/LOGO2.png" 
          alt="Compassionate Care Transportation" 
          className="h-24 w-24 object-contain"
        />
      </div>
      
      {/* Company name */}
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        Compassionate Care Transportation
      </h1>
      
      {/* Facility badge */}
      <div className="mb-6">
        <span className="px-4 py-2 bg-[#7CCFD0] text-white rounded-full text-sm font-medium">
          Facility
        </span>
      </div>
      
      {/* Loading text with animated dots */}
      <div className="text-gray-600 text-lg">
        {message}{dots}
      </div>
      
      {/* Loading spinner */}
      <div className="mt-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7CCFD0]"></div>
      </div>
      
      {/* Refresh button (shows after 10 seconds) */}
      {showRefreshButton && (
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm mb-4">Taking longer than expected?</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-[#7CCFD0] hover:bg-[#6BB5B6] text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            🔄 STUCK? REFRESH
          </button>
        </div>
      )}
    </div>
  );
}