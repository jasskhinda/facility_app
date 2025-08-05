'use client';

import { useEffect, useState } from 'react';

export default function LoadingSpinner({ 
  message = "Loading...", 
  showRefreshAfter = 10000, // 10 seconds by default
  size = "medium",
  className = ""
}) {
  const [showRefreshButton, setShowRefreshButton] = useState(false);

  // Show refresh button after specified time
  useEffect(() => {
    if (showRefreshAfter <= 0) return;
    
    const timer = setTimeout(() => {
      setShowRefreshButton(true);
    }, showRefreshAfter);

    return () => clearTimeout(timer);
  }, [showRefreshAfter]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const sizeClasses = {
    small: "h-6 w-6",
    medium: "h-12 w-12", 
    large: "h-16 w-16"
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-[#7CCFD0] ${sizeClasses[size]}`}></div>
      {message && (
        <div className="text-gray-600 text-center">
          {message}
        </div>
      )}
      
      {/* Refresh button (shows after specified time) */}
      {showRefreshButton && (
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-3">Taking longer than expected?</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-[#7CCFD0] hover:bg-[#6BB5B6] text-white font-medium rounded-lg transition-colors shadow hover:shadow-md"
          >
            🔄 STUCK? REFRESH
          </button>
        </div>
      )}
    </div>
  );
}