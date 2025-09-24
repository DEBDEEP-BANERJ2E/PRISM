import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client for public operations (with RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Create Supabase admin client (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database table names
export const TABLES = {
  DATASETS: 'datasets',
  DATASET_COLUMNS: 'dataset_columns',
  DATASET_ROWS: 'dataset_rows',
  PREPROCESSING_JOBS: 'preprocessing_jobs',
  MODEL_CONFIGURATIONS: 'model_configurations',
  TRAINING_JOBS: 'training_jobs',
  MODELS: 'models',
  PREDICTIONS: 'predictions',
  ANALYTICS: 'analytics',
  REPORTS: 'reports',
  SCENARIOS: 'scenarios',
  USERS: 'users',
  AUDIT_LOGS: 'audit_logs'
} as const;

// Database types
export interface Database {
  public: {
    Tables: {
      datasets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          file_name: string | null;
          file_size: number | null;
          row_count: number;
          column_count: number;
          status: 'uploading' | 'processing' | 'ready' | 'error';
          metadata: any | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          row_count: number;
          column_count: number;
          status?: 'uploading' | 'processing' | 'ready' | 'error';
          metadata?: any | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          row_count?: number;
          column_count?: number;
          status?: 'uploading' | 'processing' | 'ready' | 'error';
          metadata?: any | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      dataset_columns: {
        Row: {
          id: string;
          dataset_id: string;
          name: string;
          display_name: string;
          data_type: 'text' | 'number' | 'date' | 'boolean';
          is_required: boolean;
          validation_rules: any | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dataset_id: string;
          name: string;
          display_name: string;
          data_type: 'text' | 'number' | 'date' | 'boolean';
          is_required?: boolean;
          validation_rules?: any | null;
          order_index: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dataset_id?: string;
          name?: string;
          display_name?: string;
          data_type?: 'text' | 'number' | 'date' | 'boolean';
          is_required?: boolean;
          validation_rules?: any | null;
          order_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      dataset_rows: {
        Row: {
          id: string;
          dataset_id: string;
          row_index: number;
          data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dataset_id: string;
          row_index: number;
          data: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dataset_id?: string;
          row_index?: number;
          data?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      preprocessing_jobs: {
        Row: {
          id: string;
          dataset_id: string;
          status: 'queued' | 'processing' | 'completed' | 'failed';
          progress: number;
          options: any | null;
          result: any | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dataset_id: string;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          progress?: number;
          options?: any | null;
          result?: any | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          dataset_id?: string;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          progress?: number;
          options?: any | null;
          result?: any | null;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Helper function to get typed Supabase client
export function getTypedSupabase() {
  return supabase as SupabaseClient<Database>;
}

export function getTypedSupabaseAdmin() {
  return supabaseAdmin as SupabaseClient<Database>;
}