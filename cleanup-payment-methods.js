// Payment Methods Cleanup Script
// Run this in the browser console on the payment settings page

async function cleanupPaymentMethods() {
  try {
    console.log('🧹 Starting payment methods cleanup...');
    
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'; // Replace with actual facility ID
    
    const response = await fetch('/api/facility/payment/cleanup-payment-methods', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        facility_id: facilityId
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Cleanup completed successfully!');
      console.log('📊 Results:', result.cleanup_results);
      console.log(`🗑️ Removed ${result.cleanup_results.removed_from_db.length} orphaned payment methods`);
      console.log(`✅ Kept ${result.cleanup_results.kept_methods.length} valid payment methods`);
      
      if (result.cleanup_results.stripe_errors.length > 0) {
        console.log('⚠️ Errors:', result.cleanup_results.stripe_errors);
      }
      
      // Refresh the page to reload payment methods
      console.log('🔄 Refreshing page...');
      window.location.reload();
    } else {
      console.error('❌ Cleanup failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupPaymentMethods();