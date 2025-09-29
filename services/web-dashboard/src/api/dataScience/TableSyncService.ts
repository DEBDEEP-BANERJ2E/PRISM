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
  private baseUrl = 'http://localhost:3005/api/datasets'; // Supabase backend URL
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
      const response = await axios.get(`${this.baseUrl}/${datasetId}`);
      const dataset = response.data.data;

      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Convert to frontend format
      const formattedColumns = dataset.columns.map((col: any) => ({
        id: col.id,
        name: col.name,
        displayName: col.display_name,
        dataType: col.data_type,
        isRequired: col.is_required,
        validationRules: col.validation_rules,
        orderIndex: col.order_index || 0,
        field: col.name,
        headerName: col.display_name
      }));

      const formattedRows = dataset.rows.map((row: any, index: number) => ({
        id: row.id,
        rowIndex: index,
        data: row.data
      }));

      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        columns: formattedColumns,
        rows: formattedRows,
        createdAt: dataset.created_at,
        updatedAt: dataset.updated_at,
        length: formattedRows.length,
        metadata: {
          totalRows: dataset.row_count || formattedRows.length,
          totalColumns: dataset.column_count || formattedColumns.length,
          lastUpdated: new Date(dataset.updated_at),
          status: dataset.status || 'completed'
        }
      } as TableData;
    } catch (error: any) {
      console.error('Error loading table data:', error);
      // Fallback to mock data if API is not available
      return {
        id: datasetId,
        name: 'Sample Dataset',
        columns: [
          { id: '1', name: 'column1', displayName: 'Column 1', dataType: 'text', field: 'column1', headerName: 'Column 1', isRequired: false, orderIndex: 0 },
          { id: '2', name: 'column2', displayName: 'Column 2', dataType: 'number', field: 'column2', headerName: 'Column 2', isRequired: false, orderIndex: 1 }
        ],
        rows: [
          { id: '1', rowIndex: 0, data: { column1: 'Sample Data 1', column2: 100 } },
          { id: '2', rowIndex: 1, data: { column1: 'Sample Data 2', column2: 200 } }
        ],
        length: 2,
        metadata: {
          totalRows: 2,
          totalColumns: 2,
          lastUpdated: new Date(),
          status: 'completed'
        }
      };
    }
  }

  async listDatasets(): Promise<TableData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}`);
      const datasets = response.data.data.datasets || [];

      // Transform the data to match the expected format
      const enhancedDatasets = datasets.map((dataset: any) => ({
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        columns: dataset.columns || [],
        rows: dataset.rows || [],
        length: dataset.rows?.length || 0,
        metadata: {
          totalRows: dataset.row_count || 0,
          totalColumns: dataset.column_count || 0,
          lastUpdated: new Date(dataset.updated_at),
          status: dataset.status || 'completed'
        }
      }));

      return enhancedDatasets as TableData[];
    } catch (error: any) {
      console.error('Error listing datasets:', error);
      // Fallback to mock data if API is not available
      return [
        {
          id: 'dataset-1',
          name: 'Sample Dataset 1',
          columns: [],
          rows: [],
          length: 0,
          metadata: {
            totalRows: 100,
            totalColumns: 10,
            lastUpdated: new Date(),
            status: "completed"
          }
        }
      ];
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
