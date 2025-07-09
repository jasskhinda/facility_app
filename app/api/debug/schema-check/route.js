import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/route-handler-client';

export async function GET(request) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'facility_payment_methods')
      .eq('table_schema', 'public');

    // Check if function exists
    const { data: functionExists, error: functionError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'set_default_payment_method')
      .eq('routine_schema', 'public');

    // Check table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'facility_payment_methods')
      .eq('table_schema', 'public');

    return NextResponse.json({
      table: {
        exists: tableExists?.length > 0,
        error: tableError,
        columns: columns
      },
      function: {
        exists: functionExists?.length > 0,
        error: functionError,
        data: functionExists
      }
    });

  } catch (error) {
    console.error('Schema check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}