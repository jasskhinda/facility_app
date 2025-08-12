// Browser-based test script for facility user management UI
// Run this in your browser console on the facility settings page

console.log('🧪 Testing Facility User Management UI...\n');

// Test 1: Check if components are loaded
function testComponentsLoaded() {
  console.log('1. Checking if components are loaded...');
  
  // Check for tab navigation
  const tabs = document.querySelectorAll('[role="tab"], button[class*="border-b-2"]');
  if (tabs.length >= 4) {
    console.log('✅ Tab navigation found');
  } else {
    console.log('❌ Tab navigation not found or incomplete');
  }
  
  // Check for user management elements
  const userManagementElements = document.querySelectorAll('[class*="User Management"], [class*="user-management"]');
  if (userManagementElements.length > 0) {
    console.log('✅ User management elements found');
  } else {
    console.log('⚠️  User management elements not visible (may be in inactive tab)');
  }
  
  // Check for contract viewer elements
  const contractElements = document.querySelectorAll('[class*="Contract"], [class*="contract"]');
  if (contractElements.length > 0) {
    console.log('✅ Contract viewer elements found');
  } else {
    console.log('⚠️  Contract viewer elements not visible (may be in inactive tab)');
  }
}

// Test 2: Check tab switching
function testTabSwitching() {
  console.log('\n2. Testing tab switching...');
  
  const tabs = document.querySelectorAll('button[class*="border-b-2"]');
  if (tabs.length >= 4) {
    console.log(`✅ Found ${tabs.length} tabs`);
    
    // Try to click each tab
    tabs.forEach((tab, index) => {
      try {
        tab.click();
        console.log(`✅ Tab ${index + 1} clickable: ${tab.textContent.trim()}`);
      } catch (error) {
        console.log(`❌ Tab ${index + 1} not clickable: ${error.message}`);
      }
    });
  } else {
    console.log('❌ Insufficient tabs found');
  }
}

// Test 3: Check for permission-based UI
function testPermissionUI() {
  console.log('\n3. Checking permission-based UI...');
  
  // Look for invite buttons (should only be visible to super admins)
  const inviteButtons = document.querySelectorAll('button[class*="Invite"], button:contains("Invite")');
  console.log(`Found ${inviteButtons.length} invite buttons`);
  
  // Look for role badges
  const roleBadges = document.querySelectorAll('[class*="role"], [class*="badge"]');
  console.log(`Found ${roleBadges.length} potential role indicators`);
  
  // Look for permission info boxes
  const permissionBoxes = document.querySelectorAll('[class*="blue-50"], [class*="permission"]');
  console.log(`Found ${permissionBoxes.length} permission info boxes`);
}

// Test 4: Check API endpoints
async function testAPIEndpoints() {
  console.log('\n4. Testing API endpoints...');
  
  try {
    // Test the users endpoint (should require authentication)
    const response = await fetch('/api/facility/users?facilityId=test');
    console.log(`API endpoint status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('✅ API properly requires authentication');
    } else if (response.status === 400) {
      console.log('✅ API validates parameters');
    } else {
      console.log(`⚠️  Unexpected API response: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ API endpoint error: ${error.message}`);
  }
}

// Test 5: Check local storage and session
function testSessionData() {
  console.log('\n5. Checking session data...');
  
  // Check for Supabase session
  const supabaseKeys = Object.keys(localStorage).filter(key => 
    key.includes('supabase') || key.includes('auth')
  );
  
  if (supabaseKeys.length > 0) {
    console.log('✅ Authentication session data found');
  } else {
    console.log('❌ No authentication session data found');
  }
  
  // Check for user data in session storage
  const sessionKeys = Object.keys(sessionStorage);
  console.log(`Session storage keys: ${sessionKeys.length}`);
}

// Run all tests
async function runAllTests() {
  testComponentsLoaded();
  testTabSwitching();
  testPermissionUI();
  await testAPIEndpoints();
  testSessionData();
  
  console.log('\n🎉 UI testing complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Navigate to different tabs to test functionality');
  console.log('2. Try inviting a user (if you have super admin permissions)');
  console.log('3. Check that role restrictions work properly');
  console.log('4. Test contract upload/viewing');
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.facilityUserManagementTests = {
  testComponentsLoaded,
  testTabSwitching,
  testPermissionUI,
  testAPIEndpoints,
  testSessionData,
  runAllTests
};