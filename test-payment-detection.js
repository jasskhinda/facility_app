// Test script to check facility payment detection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPaymentDetection() {
  const facilityId = '1e81fe28-93e2-4b88-a81e-8933e9609da3';
  const monthToCheck = '2025-07';
  
  console.log('🔍 Testing payment detection for:', { facilityId, monthToCheck });
  
  // Parse month
  const [year, monthStr] = monthToCheck.split('-');
  const monthNumber = parseInt(monthStr);
  const yearNumber = parseInt(year);
  
  console.log('📅 Parsed month:', { monthNumber, yearNumber });
  
  try {
    // Check facility_payment_status table (used by dispatcher)
    const { data: paymentStatus, error: paymentError } = await supabase
      .from('facility_payment_status')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('invoice_month', monthNumber)
      .eq('invoice_year', yearNumber);
    
    console.log('💳 Payment status check result:', { paymentStatus, paymentError });
    
    if (paymentStatus && paymentStatus.length > 0) {
      const status = paymentStatus[0];
      console.log('✅ Found payment record:', status);
      
      if (status.status === 'PAID') {
        console.log('🎉 INVOICE IS PAID BY DISPATCHER!');
        console.log('💰 Amount:', status.total_amount);
        console.log('📅 Payment Date:', status.payment_date);
      } else {
        console.log('❌ Invoice not marked as paid, status:', status.status);
      }
    } else {
      console.log('❌ No payment record found in facility_payment_status table');
    }
    
    // Also check facility_invoices table
    const { data: invoices, error: invoiceError } = await supabase
      .from('facility_invoices')
      .select('*')
      .eq('facility_id', facilityId)
      .eq('month', monthToCheck);
    
    console.log('📄 Invoice records:', { invoices, invoiceError });
    
  } catch (error) {
    console.error('❌ Error testing payment detection:', error);
  }
}

// Run the test
testPaymentDetection().then(() => {
  console.log('✅ Test completed');
}).catch(console.error);