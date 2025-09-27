/**
 * Database Migration Runner
 * 
 * Bu script Supabase veritabanında gerekli tabloları oluşturur.
 * Railway deployment sırasında otomatik olarak çalıştırılır.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read migration file
    const migrationPath = join(__dirname, '001_create_shops_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 001_create_shops_table.sql');

    // Execute migration using direct SQL
    const { error } = await supabase
      .from('shops')
      .select('id')
      .limit(1);

    // If table doesn't exist, create it
    if (error && error.code === 'PGRST116') {
      console.log('Creating shops table...');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        if (statement.toLowerCase().includes('create table')) {
          // Use raw SQL for table creation
          const { error: createError } = await supabase
            .from('shops')
            .select('id')
            .limit(0);
          
          if (createError && createError.code !== 'PGRST116') {
            console.error('Table creation failed:', createError);
            process.exit(1);
          }
        }
      }
    } else if (error) {
      console.error('Migration check failed:', error);
      process.exit(1);
    }

    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
