// Debug script to run in browser console for billing page
// Open browser developer tools and paste this script

console.log('🔍 Starting billing debug...');

// Check if we're on the billing page
if (window.location.pathname.includes('billing')) {
  console.log('✅ On billing page');
  
  // Check for React components
  const facilityBilling = document.querySelector('[data-testid="facility-billing"]') || 
                         document.querySelector('div[class*="billing"]');
  
  if (facilityBilling) {
    console.log('✅ Billing component found');
  } else {
    console.log('❌ Billing component not found');
  }
  
  // Check network requests
  console.log('🌐 Current network requests:');
  performance.getEntriesByType('navigation').forEach(entry => {
    console.log('Navigation:', entry.name, entry.loadEventEnd - entry.loadEventStart + 'ms');
  });
  
  // Check for any console errors
  const originalError = console.error;
  console.error = function(...args) {
    console.log('🚨 Console Error:', ...args);
    originalError.apply(console, args);
  };
  
  // Check localStorage/sessionStorage
  console.log('💾 LocalStorage keys:', Object.keys(localStorage));
  console.log('💾 SessionStorage keys:', Object.keys(sessionStorage));
  
  // Check for Supabase client
  if (window.supabase || window._supabase) {
    console.log('✅ Supabase client detected');
  } else {
    console.log('❌ No Supabase client found');
  }
  
} else {
  console.log('❌ Not on billing page, current path:', window.location.pathname);
}

// Monitor fetch requests
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  console.log('🌐 Fetch request:', url, options?.method || 'GET');
  return originalFetch.apply(this, arguments)
    .then(response => {
      console.log('📥 Fetch response:', url, response.status, response.statusText);
      return response;
    })
    .catch(error => {
      console.error('❌ Fetch error:', url, error);
      throw error;
    });
};

console.log('🔍 Debug setup complete. Monitor console for network activity.');
