// Script to directly fetch and display all Supabase tables and their contents
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

// Hardcoded list of tables (as per supabaseClient.ts implementation)
const tableNames = ['datasets', 'dataset_columns', 'dataset_rows', 'models', 'scenarios', 'sample_data'];

async function fetchTableData(tableName) {
  try {
    console.log(`\n=== TABLE: ${tableName} ===\n`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1000);

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
    
    // Display table data
    data.forEach((row, index) => {
      console.log(`\n--- Row ${index + 1} ---`);
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'object' && value !== null) {
          console.log(`${key}: ${JSON.stringify(value, null, 2)}`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
    });
    
    console.log(`\nTotal rows: ${data.length}`);
  } catch (err) {
    console.error(`Unexpected error in fetchTableData for table ${tableName}: ${err}`);
  }
}

async function main() {
  console.log(`\n=== Found ${tableNames.length} tables ===\n`);
  
  // Fetch and display data for each table
  for (const tableName of tableNames) {
    await fetchTableData(tableName);
  }
}

main().catch(err => {
  console.error('Error in main execution:', err);
  process.exit(1);
});