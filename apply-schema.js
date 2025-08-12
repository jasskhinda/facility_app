import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function applySchema() {
  try {
    console.log('🔧 Applying database schema...');
    
    // Create admin client
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Read the schema file
    const schema = fs.readFileSync('db/facility_user_management_schema.sql', 'utf8');
    
    // Split into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}`);
      
      const { error } = await adminSupabase.rpc('exec_sql', { 
        sql: statement 
      });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error);
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('🎉 Schema application complete!');

  } catch (error) {
    console.error('💥 Error applying schema:', error);
  }
}

applySchema();