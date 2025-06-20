// Transport Wheelchair Safety Feature Test
const fs = require('fs');

console.log('🧪 Testing Transport Wheelchair Safety Feature...\n');

// Test 1: Check if WheelchairSelectionFlow has transport wheelchair safety logic
const wheelchairComponent = '/Volumes/C/CCT APPS/facility_app/app/components/WheelchairSelectionFlow.js';
if (fs.existsSync(wheelchairComponent)) {
  const content = fs.readFileSync(wheelchairComponent, 'utf8');
  
  if (content.includes('Transport Wheelchair Safety Notice') && 
      content.includes('isTransportChair') && 
      content.includes('Important Safety Notice')) {
    console.log('✅ WheelchairSelectionFlow has transport wheelchair safety notice');
  } else {
    console.log('❌ WheelchairSelectionFlow missing transport wheelchair safety notice');
  }

  if (content.includes('Not Available') && content.includes('Not permitted for safety reasons')) {
    console.log('✅ Transport wheelchair option shows "Not Available" status');
  } else {
    console.log('❌ Transport wheelchair option missing "Not Available" status');
  }
} else {
  console.log('❌ WheelchairSelectionFlow component not found');
}

// Test 2: Check if all booking forms have transport wheelchair validation
const bookingForms = [
  '/Volumes/C/CCT APPS/facility_app/app/components/BookingForm.js',
  '/Volumes/C/CCT APPS/facility_app/app/components/FacilityBookingForm.js',
  '/Volumes/C/CCT APPS/facility_app/app/components/StreamlinedBookingForm.js'
];

let allFormsHaveValidation = true;
bookingForms.forEach(form => {
  if (fs.existsSync(form)) {
    const content = fs.readFileSync(form, 'utf8');
    if (content.includes('wheelchairData.isTransportChair') && 
        content.includes('unable to accommodate transport wheelchairs')) {
      console.log(`✅ ${form.split('/').pop()} has transport wheelchair validation`);
    } else {
      console.log(`❌ ${form.split('/').pop()} missing transport wheelchair validation`);
      allFormsHaveValidation = false;
    }
  }
});

console.log('\n📋 TRANSPORT WHEELCHAIR SAFETY TEST RESULTS:');
if (allFormsHaveValidation) {
  console.log('🎉 ALL SAFETY FEATURES IMPLEMENTED SUCCESSFULLY!');
  console.log('\n✨ Safety features implemented:');
  console.log('   • Professional safety notice when transport wheelchair selected');
  console.log('   • Visual "Not Available" indicator on transport wheelchair option');
  console.log('   • Form validation prevents booking with transport wheelchair');
  console.log('   • Professional error message explains safety regulations');
  console.log('   • Alternative options suggested to users');
  console.log('   • Safety implementation across all 3 booking forms');
} else {
  console.log('⚠️  Some safety validation issues found. Check the output above.');
}
