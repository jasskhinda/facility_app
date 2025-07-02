// Payment Method Fix Script
// Run this in the browser console on the facility billing page

async function fixPaymentMethods() {
  try {
    console.log('🔧 Starting payment method fix...');
    
    // Get facility ID from the current page or user session
    const facilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3'; // Replace with actual facility ID
    
    const response = await fetch('/api/facility/payment/fix-payment-methods', {
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
      console.log('✅ Payment methods fixed successfully!');
      console.log(`Customer ID: ${result.customer_id}`);
      console.log(`Fixed payment methods: ${result.fixed_payment_methods.length}`);
      console.log(`Errors: ${result.error_payment_methods.length}`);
      
      if (result.fixed_payment_methods.length > 0) {
        console.log('Fixed payment methods:', result.fixed_payment_methods);
      }
      
      if (result.error_payment_methods.length > 0) {
        console.log('Payment methods with errors:', result.error_payment_methods);
      }
      
      // Refresh the page to reload payment methods
      window.location.reload();
    } else {
      console.error('❌ Failed to fix payment methods:', result.error);
    }
  } catch (error) {
    console.error('❌ Error fixing payment methods:', error);
  }
}

// Run the fix
fixPaymentMethods();