import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { APIResponse, TableData, ColumnDefinition, RowData, TableChange } from '../../types/dataScience';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DATA_SCIENCE_BACKEND_URL = import.meta.env.VITE_DATA_SCIENCE_BACKEND_URL || 'http://localhost:8000';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Database table names
const TABLES = {
  DATASETS: 'datasets',
  DATASET_COLUMNS: 'dataset_columns',
  DATASET_ROWS: 'dataset_rows'
};

interface ITableSyncService {
  addRow(datasetId: string, rowData: Record<string, any>): Promise<RowData>;
  updateCell(datasetId: string, rowId: string, columnName: string, value: any): Promise<RowData>;
  deleteRow(datasetId: string, rowId: string): Promise<void>;
  addColumn(datasetId: string, column: ColumnDefinition): Promise<ColumnDefinition>;
  updateColumn(datasetId: string, columnId: string, updates: Partial<ColumnDefinition>): Promise<ColumnDefinition>;
  deleteColumn(datasetId: string, columnId: string): Promise<void>;
  loadTableData(datasetId: string): Promise<TableData>;
  listDatasets(): Promise<TableData[]>;
  subscribeToTable(datasetId: string, callback: (change: TableChange) => void): () => void;
}

class TableSyncService implements ITableSyncService {
  private baseUrl = `${DATA_SCIENCE_BACKEND_URL}/api/datasets`;
  private supabase: SupabaseClient;

  constructor() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing Supabase configuration. Please check your environment variables.');
    }
    
    this.supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }

  private async request<T>(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        data,
        timeout: 30000,
      });
      return response.data.data as T;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.error?.message || error.response.statusText);
      } else if (error.request) {
        throw new Error('Data Science Backend is not available');
      } else {
        throw new Error(error.message);
      }
    }
  }

  async addRow(datasetId: string, rowData: Record<string, any>): Promise<RowData> {
    try {
      // Add optimistic UI update support
      const newRow = {
        id: crypto.randomUUID(),
        dataset_id: datasetId,
        data: rowData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from(TABLES.DATASET_ROWS)
        .insert(newRow)
        .select()
        .single();
        
      if (error) throw error;
      return data as unknown as RowData;
    } catch (error: any) {
      console.error('Error adding row:', error);
      throw new Error(`Failed to add row: ${error.message}`);
    }
  }

  async updateCell(datasetId: string, rowId: string, columnName: string, value: any): Promise<RowData> {
    try {
      // First get the current row data
      const { data: currentRow, error: fetchError } = await this.supabase
        .from(TABLES.DATASET_ROWS)
        .select('*')
        .eq('id', rowId)
        .eq('dataset_id', datasetId)
        .single();
        
      if (fetchError) throw fetchError;
      
      // Update the specific cell in the data object
      const updatedData = { 
        ...currentRow.data,
        [columnName]: value 
      };
      
      // Update the row with the modified data
      const { data, error } = await this.supabase
        .from(TABLES.DATASET_ROWS)
        .update({ 
          data: updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', rowId)
        .eq('dataset_id', datasetId)
        .select()
        .single();
        
      if (error) throw error;
      return data as unknown as RowData;
    } catch (error: any) {
      console.error('Error updating cell:', error);
      throw new Error(`Failed to update cell: ${error.message}`);
    }
  }

  // Implement the deleteRow method required by the interface
  async deleteRow(datasetId: string, rowId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(TABLES.DATASET_ROWS)
        .delete()
        .eq('id', rowId)
        .eq('dataset_id', datasetId);
        
      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting row:', error);
      throw new Error(`Failed to delete row: ${error.message}`);
    }
  }

  // Add a method to delete multiple rows at once
  async deleteRows(datasetId: string, rowIds: string[]): Promise<void> {
    try {
      // Delete each row one by one
      for (const rowId of rowIds) {
        await this.deleteRow(datasetId, rowId);
      }
    } catch (error: any) {
      console.error('Error deleting rows:', error);
      throw new Error(`Failed to delete rows: ${error.message}`);
    }
  }

  async addColumn(datasetId: string, column: ColumnDefinition): Promise<ColumnDefinition> {
    try {
      const newColumn = {
        id: crypto.randomUUID(),
        dataset_id: datasetId,
        name: column.name,
        display_name: column.displayName || column.name,
        data_type: column.dataType,
        is_required: column.isRequired || false,
        validation_rules: column.validationRules || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await this.supabase
        .from(TABLES.DATASET_COLUMNS)
        .insert(newColumn)
        .select()
        .single();
        
      if (error) throw error;
      
      // Convert from DB format to frontend format
      return {
        id: data.id,
        name: data.name,
        displayName: data.display_name,
        dataType: data.data_type,
        isRequired: data.is_required,
        validationRules: data.validation_rules,
        orderIndex: 0 // Default value since it's not in the database
      } as ColumnDefinition;
    } catch (error: any) {
      console.error('Error adding column:', error);
      throw new Error(`Failed to add column: ${error.message}`);
    }
  }

  async updateColumn(datasetId: string, columnId: string, updates: Partial<ColumnDefinition>): Promise<ColumnDefinition> {
    try {
      // Convert from frontend format to DB format
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.displayName) dbUpdates.display_name = updates.displayName;
      if (updates.dataType) dbUpdates.data_type = updates.dataType;
      if (updates.isRequired !== undefined) dbUpdates.is_required = updates.isRequired;
      if (updates.validationRules) dbUpdates.validation_rules = updates.validationRules;
      dbUpdates.updated_at = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from(TABLES.DATASET_COLUMNS)
        .update(dbUpdates)
        .eq('id', columnId)
        .eq('dataset_id', datasetId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Convert from DB format to frontend format
      return {
        id: data.id,
        name: data.name,
        displayName: data.display_name,
        dataType: data.data_type,
        isRequired: data.is_required,
        validationRules: data.validation_rules,
        orderIndex: 0 // Default value since it's not in the database
      } as ColumnDefinition;
    } catch (error: any) {
      console.error('Error updating column:', error);
      throw new Error(`Failed to update column: ${error.message}`);
    }
  }

  async deleteColumn(datasetId: string, columnId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(TABLES.DATASET_COLUMNS)
        .delete()
        .eq('id', columnId)
        .eq('dataset_id', datasetId);
        
      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting column:', error);
      throw new Error(`Failed to delete column: ${error.message}`);
    }
  }

  async loadTableData(datasetId: string): Promise<TableData> {
    try {
      // Get dataset info
      const { data: dataset, error: datasetError } = await this.supabase
        .from(TABLES.DATASETS)
        .select('*')
        .eq('id', datasetId)
        .single();
        
      if (datasetError) throw datasetError;
      
      // Get columns
      const { data: columns, error: columnsError } = await this.supabase
        .from(TABLES.DATASET_COLUMNS)
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: true });
        
      if (columnsError) throw columnsError;
      
      // Get rows
      const { data: rows, error: rowsError } = await this.supabase
        .from(TABLES.DATASET_ROWS)
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: true });
        
      if (rowsError) throw rowsError;
      
      // Convert to frontend format
      const formattedColumns = columns.map(col => ({
        id: col.id,
        name: col.name,
        displayName: col.display_name,
        dataType: col.data_type,
        isRequired: col.is_required,
        validationRules: col.validation_rules,
        orderIndex: 0, // Default value since it's not in the database
        field: col.name, // Add field property to match ColumnDefinition
        headerName: col.display_name // Add headerName property to match ColumnDefinition
      }));
      
      const formattedRows = rows.map(row => ({
        id: row.id,
        ...row.data
      }));
      
      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        columns: formattedColumns,
        rows: formattedRows,
        createdAt: dataset.created_at,
        updatedAt: dataset.updated_at,
        length: formattedRows.length, // Add the length property
        metadata: {
          totalRows: formattedRows.length,
          totalColumns: formattedColumns.length,
          lastUpdated: new Date(),
          status: 'completed' as const
        }
      } as TableData;
    } catch (error: any) {
      console.error('Error loading table data:', error);
      throw new Error(`Failed to load table data: ${error.message}`);
    }
  }

  async listDatasets(): Promise<TableData[]> {
    try {
      const { data: datasets, error: datasetsError } = await this.supabase
        .from(TABLES.DATASETS)
        .select('*')
        .order('created_at', { ascending: false });
        
      if (datasetsError) throw datasetsError;
      
      // For each dataset, get the column count and row count
      const enhancedDatasets = await Promise.all(datasets.map(async (dataset) => {
        const { count: columnCount, error: columnError } = await this.supabase
          .from(TABLES.DATASET_COLUMNS)
          .select('*', { count: 'exact', head: true })
          .eq('dataset_id', dataset.id);
          
        const { count: rowCount, error: rowError } = await this.supabase
          .from(TABLES.DATASET_ROWS)
          .select('*', { count: 'exact', head: true })
          .eq('dataset_id', dataset.id);
          
        if (columnError) throw columnError;
        if (rowError) throw rowError;
        
        return {
          id: dataset.id,
          name: dataset.name,
          description: dataset.description,
          columnCount: columnCount || 0,
          rowCount: rowCount || 0,
          createdAt: dataset.created_at,
          updatedAt: dataset.updated_at
        };
      }));
      
      return enhancedDatasets as unknown as TableData[];
    } catch (error: any) {
      console.error('Error listing datasets:', error);
      throw new Error(`Failed to list datasets: ${error.message}`);
    }
  }

  subscribeToTable(datasetId: string, callback: (change: TableChange) => void): () => void {
    // Implement real-time subscription using Supabase client
    const rowsSubscription = this.supabase
      .channel(`dataset-rows-${datasetId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.DATASET_ROWS,
          filter: `dataset_id=eq.${datasetId}`
        }, 
        (payload) => {
          const change: TableChange = {
            type: payload.eventType === 'INSERT' ? 'row_added' :
                  payload.eventType === 'UPDATE' ? 'row_updated' :
                  'row_deleted',
            tableId: datasetId,
            data: payload.new || payload.old,
            timestamp: new Date(),
          };
          callback(change);
        }
      )
      .subscribe();
      
    const columnsSubscription = this.supabase
      .channel(`dataset-columns-${datasetId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.DATASET_COLUMNS,
          filter: `dataset_id=eq.${datasetId}`
        }, 
        (payload) => {
          const change: TableChange = {
            type: payload.eventType === 'INSERT' ? 'column_added' :
                  payload.eventType === 'UPDATE' ? 'column_updated' :
                  'column_deleted',
            tableId: datasetId,
            data: payload.new || payload.old,
            timestamp: new Date(),
          };
          callback(change);
        }
      )
      .subscribe();
    
    // Return unsubscribe function
    return () => {
      this.supabase.channel(`dataset-rows-${datasetId}`).unsubscribe();
      this.supabase.channel(`dataset-columns-${datasetId}`).unsubscribe();
    };
  }
}

export const tableSyncService = new TableSyncService();
