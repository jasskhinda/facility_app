import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function POST(request) {
  try {
    const supabase = await createRouteHandlerClient();
    
    console.log('🔧 Fixing payment method trigger...');
    
    // SQL to fix the trigger
    const fixSQL = `
      -- Drop the problematic trigger and function
      DROP TRIGGER IF EXISTS ensure_single_default_payment_method_trigger ON facility_payment_methods;
      DROP FUNCTION IF EXISTS ensure_single_default_payment_method();
      
      -- Create a new, simplified function that doesn't reference non-existent columns
      CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Only proceed if the new record is being set as default
          IF NEW.is_default = TRUE THEN
              -- Remove default from all other payment methods for this facility
              UPDATE facility_payment_methods 
              SET is_default = FALSE 
              WHERE facility_id = NEW.facility_id AND id != NEW.id;
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Recreate the trigger
      CREATE TRIGGER ensure_single_default_payment_method_trigger
          BEFORE INSERT OR UPDATE ON facility_payment_methods
          FOR EACH ROW
          EXECUTE FUNCTION ensure_single_default_payment_method();
    `;

    // Execute the SQL using RPC
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: fixSQL 
    });

    if (error) {
      console.error('❌ Error fixing trigger:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    console.log('✅ Trigger fixed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Trigger fixed successfully',
      data 
    });

  } catch (error) {
    console.error('❌ Fix trigger error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}