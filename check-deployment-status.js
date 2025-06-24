/**
 * Production Deployment Status Check
 * This script compares local vs production API responses to verify if the client name fixes are deployed
 */

// Test the production API directly
async function testProductionAPI() {
  console.log('🔍 Testing Production API Response...\n');
  
  try {
    const response = await fetch('https://facility.compassionatecaretransportation.com/api/facility/trips-billing', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ Production API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Production API Response:');
    console.log(`Total bills: ${data.bills?.length || 0}`);
    
    if (data.bills && data.bills.length > 0) {
      console.log('\n📊 Sample Client Names from Production:');
      data.bills.slice(0, 5).forEach((bill, index) => {
        console.log(`${index + 1}. "${bill.clientName}"`);
      });
      
      // Check for our specific patterns
      const hasPhoneNumbers = data.bills.some(bill => 
        bill.clientName && bill.clientName.includes(' - ('));
      const hasManagedFormat = data.bills.some(bill => 
        bill.clientName && bill.clientName.includes('(Managed) - ('));
      const hasUnknownClients = data.bills.some(bill => 
        bill.clientName === 'Unknown Client');
      const hasFallbackClients = data.bills.some(bill => 
        bill.clientName && bill.clientName.includes('Client ('));
      
      console.log('\n🔍 Analysis:');
      console.log(`📞 Phone numbers in format: ${hasPhoneNumbers ? '✅ YES' : '❌ NO'}`);
      console.log(`👥 Managed format: ${hasManagedFormat ? '✅ YES' : '❌ NO'}`);
      console.log(`❓ Unknown Clients: ${hasUnknownClients ? '❌ YES' : '✅ NO'}`);
      console.log(`🔄 Fallback Clients: ${hasFallbackClients ? '❌ YES' : '✅ NO'}`);
      
      if (hasPhoneNumbers && hasManagedFormat && !hasUnknownClients) {
        console.log('\n🎉 SUCCESS: New client name format is DEPLOYED and working!');
      } else if (hasFallbackClients || hasUnknownClients) {
        console.log('\n⚠️  DEPLOYMENT NEEDED: Old client name format still active in production');
        console.log('💡 The local fixes need to be deployed to production server');
      }
    } else {
      console.log('❌ No billing data returned from production API');
    }
    
  } catch (error) {
    console.error('❌ Error testing production API:', error.message);
  }
}

// Check if we can determine the deployment method
function checkDeploymentOptions() {
  console.log('\n🚀 Potential Deployment Methods:');
  console.log('1. Vercel deployment (if this is a Vercel project)');
  console.log('2. Server upload/sync of the app/api/facility/trips-billing/route.js file');
  console.log('3. Docker container rebuild and deployment');
  console.log('4. Other hosting platform deployment');
  
  console.log('\n📝 Key File to Deploy:');
  console.log('   app/api/facility/trips-billing/route.js');
  console.log('   (Contains the client name formatting fixes)');
}

// Run the checks
async function main() {
  console.log('🏥 CCT Facility App - Deployment Status Check');
  console.log('='.repeat(50));
  
  await testProductionAPI();
  checkDeploymentOptions();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy the updated app/api/facility/trips-billing/route.js to production');
  console.log('2. Test the billing page again at: https://facility.compassionatecaretransportation.com/dashboard/billing');
  console.log('3. Verify client names show as "David Patel (Managed) - (416) 555-2233" format');
}

main().catch(console.error);
