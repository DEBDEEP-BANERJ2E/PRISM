// Script to fetch and display all Supabase tables and their contents
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api'; // API endpoint path from server configuration

async function fetchAllTables() {
  try {
    console.log('Fetching list of tables...');
    const tablesResponse = await axios.get(`${API_BASE_URL}/tables`);
    
    if (!tablesResponse.data.success) {
      console.error('Failed to fetch tables:', tablesResponse.data);
      return;
    }
    
    const tables = tablesResponse.data.data;
    console.log(`\n=== Found ${tables.length} tables ===\n`);
    
    // Fetch and display data for each table
    for (const tableName of tables) {
      console.log(`\n=== TABLE: ${tableName} ===\n`);
      
      try {
        const tableDataResponse = await axios.get(`${API_BASE_URL}/tables/${tableName}`);
        
        if (!tableDataResponse.data.success) {
          console.error(`Failed to fetch data for table ${tableName}:`, tableDataResponse.data);
          continue;
        }
        
        const tableData = tableDataResponse.data.data;
        
        if (tableData.length === 0) {
          console.log(`Table ${tableName} is empty.`);
          continue;
        }
        
        // Display table structure (column names)
        const columns = Object.keys(tableData[0]);
        console.log('COLUMNS:', columns.join(', '));
        console.log('\nROWS:');
        
        // Display table data
        tableData.forEach((row, index) => {
          console.log(`\n--- Row ${index + 1} ---`);
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'object' && value !== null) {
              console.log(`${key}: ${JSON.stringify(value, null, 2)}`);
            } else {
              console.log(`${key}: ${value}`);
            }
          }
        });
        
        console.log(`\nTotal rows: ${tableData.length}`);
      } catch (error) {
        console.error(`Error fetching data for table ${tableName}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error fetching tables:', error.message);
  }
}

// Execute the function
fetchAllTables();