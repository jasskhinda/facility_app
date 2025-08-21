'use client';

import { useEffect } from 'react';
import { useLoading } from './LoadingProvider';

export default function NavigationLoader() {
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    // Only handle form submissions to avoid interfering with navigation
    const handleFormSubmit = (e) => {
      const form = e.target;
      if (form.tagName === 'FORM') {
        showLoading('Processing...');
        
        // Auto-hide after 1 second as fallback
        setTimeout(() => {
          hideLoading();
        }, 1000);
      }
    };

    // Only handle submit button clicks, not all button clicks
    const handleButtonClick = (e) => {
      const button = e.target.closest('button');
      if (button && button.type === 'submit' && !button.closest('a')) {
        showLoading('Processing...');
        
        // Auto-hide after 1 second as fallback
        setTimeout(() => {
          hideLoading();
        }, 1000);
      }
    };

    document.addEventListener('submit', handleFormSubmit);
    document.addEventListener('click', handleButtonClick);

    return () => {
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('click', handleButtonClick);
    };
  }, [showLoading, hideLoading]);

  return null; // This component doesn't render anything
}