// Navigation Test Script for Facility App
// This script verifies that navigation links are working correctly

console.log('🔍 Testing Facility App Navigation...');

// Test if we're on the right domain
if (window.location.hostname === 'localhost' || window.location.hostname.includes('facility.compassionatecaretransportation.com')) {
  console.log('✅ Domain check passed');
} else {
  console.log('❌ Domain check failed - unexpected domain:', window.location.hostname);
}

// Test if navigation links exist and are clickable
const testNavigationLinks = () => {
  const navLinks = document.querySelectorAll('a[href*="/dashboard"]');
  console.log(`📍 Found ${navLinks.length} dashboard navigation links`);
  
  navLinks.forEach((link, index) => {
    const href = link.getAttribute('href');
    const text = link.textContent.trim();
    const isClickable = !link.hasAttribute('disabled') && 
                       link.style.pointerEvents !== 'none' &&
                       !link.classList.contains('disabled');
    
    console.log(`${index + 1}. Link: "${text}" -> ${href} (Clickable: ${isClickable})`);
    
    // Check if the link has any event listeners that might prevent navigation
    const computedStyle = window.getComputedStyle(link);
    if (computedStyle.pointerEvents === 'none') {
      console.log(`⚠️  Link "${text}" has pointer-events: none`);
    }
  });
};

// Test if there are any overlays that might block clicks
const testForOverlays = () => {
  const overlays = document.querySelectorAll('[class*="loading"], [class*="overlay"], [style*="z-index"]');
  const highZIndexElements = Array.from(overlays).filter(el => {
    const zIndex = parseInt(window.getComputedStyle(el).zIndex);
    return zIndex > 40; // High z-index that might block navigation
  });
  
  if (highZIndexElements.length > 0) {
    console.log('⚠️  Found potential overlay elements that might block navigation:');
    highZIndexElements.forEach(el => {
      console.log('  -', el.className, 'z-index:', window.getComputedStyle(el).zIndex);
    });
  } else {
    console.log('✅ No blocking overlays detected');
  }
};

// Run tests after page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      testNavigationLinks();
      testForOverlays();
    }, 1000);
  });
} else {
  setTimeout(() => {
    testNavigationLinks();
    testForOverlays();
  }, 1000);
}

// Test click simulation on trips link
const testTripsNavigation = () => {
  const tripsLink = document.querySelector('a[href="/dashboard/trips"]');
  if (tripsLink) {
    console.log('🔗 Testing trips navigation link...');
    // Add a temporary click listener to test
    const testClick = (e) => {
      console.log('✅ Trips link click detected - navigation should work');
      tripsLink.removeEventListener('click', testClick);
    };
    tripsLink.addEventListener('click', testClick);
  } else {
    console.log('❌ Trips navigation link not found');
  }
};

setTimeout(testTripsNavigation, 2000);

console.log('🔧 Navigation test script loaded. Check console for results.');
