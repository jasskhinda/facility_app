// BROWSER CONSOLE DEBUG SCRIPT
// Copy and paste this into the browser console on the billing page
// This will help debug what's happening with the frontend

console.log('🔍 BILLING PAGE DEBUG SCRIPT');
console.log('============================');

// Function to check current user session
async function checkCurrentUser() {
    console.log('\n1️⃣ Checking current user session...');
    
    try {
        // Check if there's a Supabase client available
        if (typeof window.supabase === 'undefined') {
            console.log('⚠️ Supabase client not found on window. Trying to access from component...');
        }
        
        // Check localStorage for session
        const supabaseKeys = Object.keys(localStorage).filter(key => key.includes('supabase'));
        console.log('📱 Supabase localStorage keys:', supabaseKeys);
        
        supabaseKeys.forEach(key => {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.access_token) {
                    console.log(`✅ Found session in ${key}:`, {
                        user_id: data.user?.id,
                        email: data.user?.email,
                        expires_at: new Date(data.expires_at * 1000).toLocaleString()
                    });
                }
            } catch (e) {
                // Ignore parsing errors
            }
        });
        
    } catch (error) {
        console.error('❌ Error checking user session:', error);
    }
}

// Function to check what profile data is being used
async function checkProfileData() {
    console.log('\n2️⃣ Checking profile data from page state...');
    
    try {
        // Look for React components in the page
        const reactRoot = document.querySelector('[data-reactroot]') || document.querySelector('#__next');
        
        if (reactRoot) {
            console.log('✅ React app found');
            
            // Check for any global state or debug info
            if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                console.log('✅ React DevTools detected');
            }
        }
        
        // Check for any error messages on the page
        const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
        if (errorElements.length > 0) {
            console.log('⚠️ Found error elements on page:', errorElements.length);
            errorElements.forEach((el, index) => {
                console.log(`   Error ${index + 1}:`, el.textContent);
            });
        }
        
        // Check for loading states
        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="animate-spin"]');
        if (loadingElements.length > 0) {
            console.log('🔄 Found loading elements:', loadingElements.length);
        }
        
    } catch (error) {
        console.error('❌ Error checking profile data:', error);
    }
}

// Function to check console messages
function checkConsoleMessages() {
    console.log('\n3️⃣ Monitoring console messages...');
    
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.log('📱 Console monitoring active. Look for billing-related messages...');
    console.log('🔍 Look for messages containing:');
    console.log('   - "fetchMonthlyTrips"');
    console.log('   - "facilityId"');
    console.log('   - "No facility users found"');
    console.log('   - "Query result"');
}

// Function to simulate clicking refresh or month selection
function testBillingInteraction() {
    console.log('\n4️⃣ Testing billing page interactions...');
    
    try {
        // Look for month selector
        const monthSelect = document.querySelector('select');
        if (monthSelect) {
            console.log('✅ Found month selector:', monthSelect.value);
            console.log('📅 Available options:', Array.from(monthSelect.options).map(opt => opt.value));
        }
        
        // Look for the billing component elements
        const billingElements = document.querySelectorAll('[class*="billing"], [class*="Billing"]');
        console.log(`📋 Found ${billingElements.length} billing-related elements`);
        
        // Look for trip tables or lists
        const tripElements = document.querySelectorAll('table, [class*="trip"], [class*="Trip"]');
        console.log(`🚗 Found ${tripElements.length} trip-related elements`);
        
        // Check for "No trips found" message
        const noTripsElements = Array.from(document.querySelectorAll('*')).filter(el => 
            el.textContent.includes('No trips found') || 
            el.textContent.includes('no trips') ||
            el.textContent.includes('Found 1 trips in other months')
        );
        
        if (noTripsElements.length > 0) {
            console.log('📝 Found "no trips" messages:', noTripsElements.length);
            noTripsElements.forEach((el, index) => {
                console.log(`   Message ${index + 1}:`, el.textContent.trim());
            });
        }
        
    } catch (error) {
        console.error('❌ Error testing interactions:', error);
    }
}

// Function to check network requests
function monitorNetworkRequests() {
    console.log('\n5️⃣ Monitoring network requests...');
    
    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        console.log('🌐 Fetch request:', args[0]);
        return originalFetch.apply(this, arguments)
            .then(response => {
                console.log('📡 Response:', response.status, args[0]);
                return response;
            });
    };
    
    console.log('📡 Network monitoring active. Make a request to see details.');
}

// Run all checks
async function runFullDiagnostic() {
    console.log('🚀 Running full billing page diagnostic...\n');
    
    await checkCurrentUser();
    await checkProfileData();
    checkConsoleMessages();
    testBillingInteraction();
    monitorNetworkRequests();
    
    console.log('\n✅ Diagnostic complete!');
    console.log('💡 What to do next:');
    console.log('   1. Check the console for any billing-related error messages');
    console.log('   2. Try changing the month in the dropdown');
    console.log('   3. Check if you\'re logged in as a facility user');
    console.log('   4. Run the SQL script in Supabase to ensure data exists');
}

// Run the diagnostic
runFullDiagnostic();
