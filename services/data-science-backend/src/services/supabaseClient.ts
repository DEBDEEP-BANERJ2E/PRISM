import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // For backend operations

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(useServiceRole: boolean = false): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      logger.error('Supabase environment variables are not set.');
      throw new Error('Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) must be set.');
    }
    supabase = createClient(supabaseUrl, useServiceRole ? supabaseServiceRoleKey : supabaseAnonKey);
    logger.info('Supabase client initialized.');
  }
  return supabase;
}

// Initialize with service role key for backend operations
export const supabaseServiceRole = getSupabaseClient(true);

export async function getAllTableNames(): Promise<string[]> {
  // For development, return a hardcoded list of tables
  logger.info('Using hardcoded list of tables for development');
  return ['datasets', 'dataset_columns', 'dataset_rows', 'models', 'scenarios', 'sample_data'];
}

export async function getTableData(tableName: string): Promise<any[]> {
  try {
    const { data, error } = await supabaseServiceRole
      .from(tableName)
      .select('*')
      .limit(1000); // Adding a limit to prevent excessive data retrieval

    if (error) {
      logger.error(`Error fetching data for table ${tableName}: ${error.message}`);
      throw new Error(`Error fetching data for table ${tableName}: ${error.message}`);
    }

    logger.info(`Successfully fetched ${data.length} rows from table ${tableName}`);
    return data;
  } catch (err) {
    logger.error(`Unexpected error in getTableData for table ${tableName}: ${err}`);
    throw err;
  }
}