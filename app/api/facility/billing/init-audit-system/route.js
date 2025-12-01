/**
 * Initialize Enterprise Billing Audit System
 * Creates necessary database tables and functions if they don't exist
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Create Supabase client lazily to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  const supabase = getSupabase();
  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError || !['admin', 'dispatcher'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if audit system tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('check_table_exists', { table_name: 'billing_audit_log' });

    if (tablesError) {
      console.log('Creating audit system tables...');
      
      // Read and execute the SQL schema
      try {
        const sqlPath = join(process.cwd(), 'db/billing/01_audit_system.sql');
        const sqlContent = readFileSync(sqlPath, 'utf8');
        
        // Split by statements and execute each one
        const statements = sqlContent.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
          if (statement.trim()) {
            const { error: execError } = await supabase.rpc('execute_sql', { 
              sql_statement: statement.trim() 
            });
            
            if (execError) {
              console.error('SQL execution error:', execError);
              // Continue with other statements
            }
          }
        }
      } catch (fileError) {
        console.error('Could not read SQL file:', fileError);
        // Create essential tables manually
        await createEssentialTables();
      }
    }

    // Verify audit system is working
    const { data: auditTest, error: auditError } = await supabase
      .from('billing_audit_log')
      .insert({
        user_id: session.user.id,
        action: 'AUDIT_SYSTEM_INITIALIZED',
        entity_type: 'system',
        entity_id: session.user.id,
        changes: { initialized_at: new Date().toISOString() },
        metadata: { source: 'api_initialization' }
      })
      .select()
      .single();

    if (auditError) {
      console.error('Audit system test failed:', auditError);
      return NextResponse.json({
        success: false,
        error: 'Audit system initialization failed',
        details: auditError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Enterprise billing audit system initialized successfully',
      audit_entry_id: auditTest.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Audit system initialization error:', error);
    return NextResponse.json({
      success: false,
      error: 'System initialization failed',
      details: error.message
    }, { status: 500 });
  }
}

async function createEssentialTables() {
  // Create minimal audit log table
  const { error: auditError } = await supabase.rpc('execute_sql', {
    sql_statement: `
      CREATE TABLE IF NOT EXISTS billing_audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        user_id UUID REFERENCES auth.users(id),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        changes JSONB,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `
  });

  if (auditError) {
    console.error('Failed to create audit log table:', auditError);
  }

  // Add missing columns to facility_invoice_payments if needed
  const { error: paymentsError } = await supabase.rpc('execute_sql', {
    sql_statement: `
      ALTER TABLE facility_invoice_payments 
      ADD COLUMN IF NOT EXISTS idempotency_key UUID,
      ADD COLUMN IF NOT EXISTS payment_hash VARCHAR(64),
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '[]';
    `
  });

  if (paymentsError) {
    console.error('Failed to update payments table:', paymentsError);
  }
}