// LIVE MANAGED CLIENTS DIAGNOSTIC
// Run this in browser console on the booking page to see what managed client data exists

console.log('🔍 LIVE MANAGED CLIENTS DIAGNOSTIC');
console.log('==================================');

async function fetchActualManagedClients() {
  try {
    console.log('\n1️⃣ Checking if we can access managed clients data...');
    
    // Try to find any API calls related to managed clients
    console.log('Looking for managed client API endpoints...');
    
    // Check if there's a managed clients API endpoint
    const possibleEndpoints = [
      '/api/managed-clients',
      '/api/facility/managed-clients', 
      '/api/clients',
      '/api/facility/clients'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Found data at ${endpoint}:`, data);
        } else {
          console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }
    
    console.log('\n2️⃣ Checking DOM for client selection dropdown...');
    
    // Look for client selection elements
    const selectElements = document.querySelectorAll('select, [role="combobox"], [data-testid*="client"]');
    console.log(`Found ${selectElements.length} potential client selection elements`);
    
    selectElements.forEach((el, index) => {
      if (el.innerHTML && el.innerHTML.includes('David Patel')) {
        console.log(`✅ Found client data in element ${index}:`, {
          tagName: el.tagName,
          id: el.id,
          className: el.className,
          innerHTML: el.innerHTML.substring(0, 200) + '...'
        });
      }
    });
    
    console.log('\n3️⃣ Looking for client data in page scripts...');
    
    // Check if client data is available in window object
    const possibleClientData = [
      'window.managedClients',
      'window.clients', 
      'window.clientData',
      'window.facilityClients'
    ];
    
    possibleClientData.forEach(path => {
      try {
        const data = eval(path);
        if (data) {
          console.log(`✅ Found client data at ${path}:`, data);
        }
      } catch (error) {
        // Ignore - variable doesn't exist
      }
    });
    
    console.log('\n4️⃣ Manual test: Create a managed client API call...');
    
    // Try to replicate what the billing API should do
    try {
      const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'; // From the API route
      
      // Create a test call to see if we can fetch managed clients directly
      const testUrl = `/api/test-managed-clients?facility_id=${facilityId}`;
      
      console.log(`Attempting to fetch: ${testUrl}`);
      
      const response = await fetch(testUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Managed clients data:', data);
      } else {
        console.log('❌ No direct managed clients API available');
      }
    } catch (error) {
      console.log('⚠️ Could not test managed clients API:', error.message);
    }
    
    console.log('\n5️⃣ Next steps based on findings...');
    
    console.log('🎯 GOAL: Find where "David Patel (Managed)" data comes from');
    console.log('📋 Recommendations:');
    console.log('   1. Check network tab when loading booking page');
    console.log('   2. Look for API calls that fetch managed clients');
    console.log('   3. Note the exact API endpoint and data structure');
    console.log('   4. Ensure billing API uses the same endpoint/structure');
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

// Run the diagnostic
fetchActualManagedClients();

// Manual functions
window.fetchManagedClients = fetchActualManagedClients;
console.log('\n💡 Run fetchManagedClients() to test again');
