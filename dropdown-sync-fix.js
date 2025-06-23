// DROPDOWN SYNC FIX - Run this in browser console
// This fixes the month mismatch between dropdown and display text

(function fixDropdownSync() {
  console.log('🔧 DROPDOWN SYNC FIX: Starting...');
  
  try {
    // Find the dropdown and the display text
    const dropdown = document.querySelector('select');
    const displayText = document.querySelector('h2 + p');
    
    if (!dropdown) {
      console.error('❌ No dropdown found');
      return;
    }
    
    if (!displayText) {
      console.error('❌ No display text found');
      return;
    }
    
    console.log('📅 Current state:');
    console.log('   Dropdown value:', dropdown.value);
    console.log('   Display text:', displayText.textContent);
    
    // Extract month from display text
    const displayMatch = displayText.textContent.match(/for\s+(\w+\s+\d{4})/);
    if (!displayMatch) {
      console.error('❌ Could not parse display text');
      return;
    }
    
    const displayedMonth = displayMatch[1]; // e.g., "March 2025"
    console.log('📅 Extracted displayed month:', displayedMonth);
    
    // Convert displayed month to YYYY-MM format
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const [monthName, year] = displayedMonth.split(' ');
    const monthIndex = monthNames.indexOf(monthName);
    
    if (monthIndex === -1) {
      console.error('❌ Invalid month name:', monthName);
      return;
    }
    
    const correctValue = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    console.log('📅 Correct dropdown value should be:', correctValue);
    
    // Check if the dropdown has this option
    const correctOption = dropdown.querySelector(`option[value="${correctValue}"]`);
    if (!correctOption) {
      console.error('❌ Dropdown does not have option for:', correctValue);
      console.log('Available options:', Array.from(dropdown.options).map(o => `${o.value}: ${o.text}`));
      return;
    }
    
    // Force the dropdown to match the display
    console.log('🔧 Fixing dropdown to match display...');
    dropdown.value = correctValue;
    
    // Trigger change event to update React state
    const changeEvent = new Event('change', { bubbles: true });
    dropdown.dispatchEvent(changeEvent);
    
    console.log('✅ Dropdown sync fix complete!');
    console.log('📅 Final state:');
    console.log('   Dropdown value:', dropdown.value);
    console.log('   Display text:', displayText.textContent);
    
    // Verify the fix worked
    setTimeout(() => {
      const newDisplayText = document.querySelector('h2 + p');
      console.log('🔍 Verification after 1 second:');
      console.log('   Dropdown value:', dropdown.value);
      console.log('   Display text:', newDisplayText?.textContent || 'Not found');
      
      if (dropdown.value === correctValue) {
        console.log('✅ Dropdown is now synchronized!');
      } else {
        console.log('⚠️ Dropdown may need manual refresh');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error in dropdown sync fix:', error);
  }
})();
