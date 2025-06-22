// FINAL BILLING TEST SCRIPT
// Run this in the browser console on https://facility.compassionatecaretransportation.com/dashboard/billing
// This will test all the improvements we made

console.log('🎯 FINAL BILLING FIX TEST STARTED');
console.log('⏰ Current time:', new Date().toISOString());

// Test function to verify the billing component works
async function testBillingFix() {
  console.log('\n🧪 Testing the comprehensive billing fix...');
  
  try {
    // Check if we can access supabase
    const supabase = window.supabaseClient || window._supabaseClient;
    if (!supabase) {
      console.error('❌ Cannot access Supabase client');
      return;
    }
    
    // Get current user and facility
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ User not logged in');
      return;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('facility_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.facility_id) {
      console.error('❌ User has no facility_id');
      return;
    }
    
    console.log('✅ User and facility found:', { userId: user.id, facilityId: profile.facility_id });
    
    // Get facility users
    const { data: facilityUsers } = await supabase
      .from('profiles')
      .select('id')
      .eq('facility_id', profile.facility_id);
    
    if (!facilityUsers?.length) {
      console.error('❌ No facility users found');
      return;
    }
    
    const facilityUserIds = facilityUsers.map(u => u.id);
    console.log('✅ Facility users found:', facilityUserIds.length);
    
    // Test ALL three approaches from our comprehensive fix
    
    // APPROACH 1: Standard datetime filtering
    console.log('\n🔄 Testing Approach 1: Standard datetime filtering...');
    const startDate = new Date('2025-06-01');
    const endDate = new Date('2025-06-30T23:59:59.999Z');
    
    const { data: trips1 } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', startDate.toISOString())
      .lte('pickup_time', endDate.toISOString())
      .not('price', 'is', null)
      .gt('price', 0);
    
    console.log(`📊 Approach 1 found: ${trips1?.length || 0} trips`);
    
    if (trips1?.length > 0) {
      const validTrips1 = trips1.filter(trip => {
        const validStatuses = ['completed', 'pending', 'upcoming', 'confirmed', 'in_progress', 'finished', 'active', 'booked'];
        return validStatuses.includes(trip.status?.toLowerCase());
      });
      console.log(`✅ Valid status trips (Approach 1): ${validTrips1.length}/${trips1.length}`);
      
      if (validTrips1.length > 0) {
        console.log('🎉 SUCCESS! Approach 1 found valid trips:', validTrips1);
        return;
      }
    }
    
    // APPROACH 2: Date-only filtering
    console.log('\n🔄 Testing Approach 2: Date-only filtering...');
    const { data: trips2 } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', '2025-06-01')
      .lt('pickup_time', '2025-07-01')
      .not('price', 'is', null)
      .gt('price', 0);
    
    console.log(`📊 Approach 2 found: ${trips2?.length || 0} trips`);
    
    if (trips2?.length > 0) {
      const validTrips2 = trips2.filter(trip => {
        const validStatuses = ['completed', 'pending', 'upcoming', 'confirmed', 'in_progress', 'finished', 'active', 'booked'];
        return validStatuses.includes(trip.status?.toLowerCase());
      });
      console.log(`✅ Valid status trips (Approach 2): ${validTrips2.length}/${trips2.length}`);
      
      if (validTrips2.length > 0) {
        console.log('🎉 SUCCESS! Approach 2 found valid trips:', validTrips2);
        return;
      }
    }
    
    // APPROACH 3: No status filtering
    console.log('\n🔄 Testing Approach 3: No status filtering...');
    const { data: trips3 } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .gte('pickup_time', '2025-06-01')
      .lt('pickup_time', '2025-07-01')
      .not('price', 'is', null)
      .gt('price', 0);
    
    console.log(`📊 Approach 3 found: ${trips3?.length || 0} trips`);
    
    if (trips3?.length > 0) {
      console.log('🎉 SUCCESS! Approach 3 found trips (any status):', trips3);
      return;
    }
    
    // DIAGNOSTIC: Check any trips at all
    console.log('\n🔍 Running diagnostic - checking for ANY trips...');
    const { data: anyTrips } = await supabase
      .from('trips')
      .select('id, pickup_time, price, status, user_id')
      .in('user_id', facilityUserIds)
      .not('price', 'is', null)
      .gt('price', 0)
      .order('pickup_time', { ascending: false })
      .limit(10);
    
    if (anyTrips?.length > 0) {
      console.log(`📊 Found ${anyTrips.length} trips in total:`, anyTrips);
      
      // Group by month
      const monthGroups = {};
      anyTrips.forEach(trip => {
        const date = new Date(trip.pickup_time);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
        monthGroups[monthKey].push(trip);
      });
      
      console.log('📊 Trips by month:', monthGroups);
      
      // Check June 2025 specifically
      if (monthGroups['2025-06']) {
        console.log('🎉 Found June 2025 trips!', monthGroups['2025-06']);
      } else {
        console.log('❌ No June 2025 trips found');
      }
    } else {
      console.log('❌ No trips found at all for facility users');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test month selection functionality
function testMonthSelection() {
  console.log('\n📅 Testing month selection...');
  
  const select = document.querySelector('select');
  if (!select) {
    console.error('❌ Month selector not found');
    return;
  }
  
  console.log('✅ Month selector found');
  console.log('Current value:', select.value);
  console.log('Available options:', Array.from(select.options).map(opt => ({ value: opt.value, text: opt.text })));
  
  // Test changing to June 2025
  const june2025Option = Array.from(select.options).find(opt => opt.value === '2025-06');
  if (june2025Option) {
    console.log('✅ June 2025 option found');
    select.value = '2025-06';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    console.log('📅 Changed to June 2025');
  } else {
    console.log('❌ June 2025 option not found');
  }
}

// Check current page state
function checkPageState() {
  console.log('\n📋 Current page state:');
  
  const errorElement = document.querySelector('[class*="bg-red"]');
  if (errorElement) {
    console.log('🚨 Error message:', errorElement.textContent);
  }
  
  const tripCount = document.querySelector('p.text-2xl');
  if (tripCount) {
    console.log('🚗 Trip count display:', tripCount.textContent);
  }
  
  const totalAmount = document.querySelector('.text-\\[\\#7CCFD0\\]');
  if (totalAmount) {
    console.log('💰 Total amount display:', totalAmount.textContent);
  }
}

// Run all tests
console.log('🚀 Running comprehensive billing tests...');
checkPageState();
testMonthSelection();
testBillingFix();

// Set up monitoring
let monitorCount = 0;
const monitor = setInterval(() => {
  monitorCount++;
  console.log(`\n🔄 Monitor check #${monitorCount}`);
  checkPageState();
  
  if (monitorCount >= 3) {
    clearInterval(monitor);
    console.log('\n✅ BILLING FIX TEST COMPLETE');
    console.log('📋 Check the logs above for results');
    console.log('🎯 If trips are found in the database but not showing, the issue is likely with status filtering or date formatting');
  }
}, 5000);

console.log('\n📝 TEST INSTRUCTIONS:');
console.log('1. Watch the console output above');
console.log('2. Try changing the month selector manually');
console.log('3. Check if trips appear after our fixes');
console.log('4. If still not working, the diagnostic will show what trips exist and why they\'re not matching');
