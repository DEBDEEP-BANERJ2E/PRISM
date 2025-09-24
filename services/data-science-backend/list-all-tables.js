// Script to list all actual tables in the Supabase database and display their contents
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) must be set.');
  process.exit(1);
}

// Initialize Supabase client with service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
console.log('Supabase client initialized.');

async function listAllTables() {
  try {
    // Query information_schema.tables to get all tables in the public schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.error('Error fetching tables:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('No tables found in the public schema.');
      return [];
    }

    // Extract table names
    const tableNames = data.map(table => table.table_name);
    console.log(`\n=== Found ${tableNames.length} tables in public schema ===\n`);
    console.log('Tables:', tableNames.join(', '));
    
    return tableNames;
  } catch (err) {
    console.error('Unexpected error in listAllTables:', err);
    return [];
  }
}

async function fetchTableData(tableName) {
  try {
    console.log(`\n=== TABLE: ${tableName} ===\n`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(100);

    if (error) {
      console.error(`Error fetching data for table ${tableName}: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`Table ${tableName} is empty.`);
      return;
    }

    // Display table structure (column names)
    const columns = Object.keys(data[0]);
    console.log('COLUMNS:', columns.join(', '));
    console.log('\nROWS:');
    
    // Display table data (first 5 rows for brevity)
    const displayRows = data.slice(0, 5);
    displayRows.forEach((row, index) => {
      console.log(`\n--- Row ${index + 1} ---`);
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'object' && value !== null) {
          console.log(`${key}: ${JSON.stringify(value, null, 2)}`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
    });
    
    console.log(`\nTotal rows: ${data.length} (showing first 5)`);
  } catch (err) {
    console.error(`Unexpected error in fetchTableData for table ${tableName}: ${err}`);
  }
}

async function main() {
  // Get all actual tables
  const tableNames = await listAllTables();
  
  // Fetch and display data for each table
  for (const tableName of tableNames) {
    await fetchTableData(tableName);
  }
}

main().catch(err => {
  console.error('Error in main execution:', err);
  process.exit(1);
});