import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function POST(request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user profile to check if they're an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // SQL to fix the trigger
    const fixSQL = `
      -- Drop the problematic trigger and function
      DROP TRIGGER IF EXISTS ensure_single_default_payment_method_trigger ON facility_payment_methods;
      DROP FUNCTION IF EXISTS ensure_single_default_payment_method();
      
      -- Create a new, simplified function
      CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NEW.is_default = TRUE THEN
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

    const { error } = await supabase.rpc('exec_sql', { sql: fixSQL });

    if (error) {
      console.error('Error fixing trigger:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Trigger fixed successfully' });

  } catch (error) {
    console.error('Fix trigger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}