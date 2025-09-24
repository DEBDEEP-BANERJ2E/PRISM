import { getTypedSupabaseAdmin, TABLES, Tables, Inserts, Updates } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

export type Dataset = Tables<'datasets'>;
export type DatasetColumn = Tables<'dataset_columns'>;
export type DatasetRow = Tables<'dataset_rows'>;
export type PreprocessingJob = Tables<'preprocessing_jobs'>;

export interface CreateDatasetRequest {
  name: string;
  description?: string;
  fileName?: string;
  fileSize?: number;
  columns: Array<{
    name: string;
    displayName: string;
    dataType: 'text' | 'number' | 'date' | 'boolean';
    isRequired?: boolean;
    validationRules?: any;
  }>;
  rows: Array<Record<string, any>>;
  metadata?: any;
  createdBy?: string;
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
  status?: Dataset['status'];
  metadata?: any;
}

export class DatasetModel {
  private supabase = getTypedSupabaseAdmin();

  /**
   * Create a new dataset with columns and rows
   */
  async create(data: CreateDatasetRequest): Promise<Dataset> {
    const datasetId = uuidv4();
    
    // Start transaction
    const { data: dataset, error: datasetError } = await this.supabase
      .from(TABLES.DATASETS)
      .insert({
        id: datasetId,
        name: data.name,
        description: data.description,
        file_name: data.fileName,
        file_size: data.fileSize,
        row_count: data.rows.length,
        column_count: data.columns.length,
        status: 'processing',
        metadata: data.metadata,
        created_by: data.createdBy
      })
      .select()
      .single();

    if (datasetError) {
      throw new Error(`Failed to create dataset: ${datasetError.message}`);
    }

    // Create columns
    const columnsToInsert = data.columns.map((col, index) => ({
      id: uuidv4(),
      dataset_id: datasetId,
      name: col.name,
      display_name: col.displayName,
      data_type: col.dataType,
      is_required: col.isRequired || false,
      validation_rules: col.validationRules,
      order_index: index
    }));

    const { error: columnsError } = await this.supabase
      .from(TABLES.DATASET_COLUMNS)
      .insert(columnsToInsert);

    if (columnsError) {
      // Rollback dataset creation
      await this.supabase.from(TABLES.DATASETS).delete().eq('id', datasetId);
      throw new Error(`Failed to create dataset columns: ${columnsError.message}`);
    }

    // Create rows
    const rowsToInsert = data.rows.map((row, index) => ({
      id: uuidv4(),
      dataset_id: datasetId,
      row_index: index,
      data: row
    }));

    const { error: rowsError } = await this.supabase
      .from(TABLES.DATASET_ROWS)
      .insert(rowsToInsert);

    if (rowsError) {
      // Rollback dataset and columns creation
      await this.supabase.from(TABLES.DATASET_COLUMNS).delete().eq('dataset_id', datasetId);
      await this.supabase.from(TABLES.DATASETS).delete().eq('id', datasetId);
      throw new Error(`Failed to create dataset rows: ${rowsError.message}`);
    }

    // Update dataset status to ready
    const { data: updatedDataset, error: updateError } = await this.supabase
      .from(TABLES.DATASETS)
      .update({ status: 'ready' })
      .eq('id', datasetId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update dataset status: ${updateError.message}`);
    }

    return updatedDataset;
  }

  /**
   * Get dataset by ID with columns and rows
   */
  async getById(id: string): Promise<Dataset & { columns: DatasetColumn[]; rows: DatasetRow[] } | null> {
    const { data: dataset, error: datasetError } = await this.supabase
      .from(TABLES.DATASETS)
      .select('*')
      .eq('id', id)
      .single();

    if (datasetError || !dataset) {
      return null;
    }

    // Get columns
    const { data: columns, error: columnsError } = await this.supabase
      .from(TABLES.DATASET_COLUMNS)
      .select('*')
      .eq('dataset_id', id)
      .order('order_index');

    if (columnsError) {
      throw new Error(`Failed to fetch dataset columns: ${columnsError.message}`);
    }

    // Get rows
    const { data: rows, error: rowsError } = await this.supabase
      .from(TABLES.DATASET_ROWS)
      .select('*')
      .eq('dataset_id', id)
      .order('row_index');

    if (rowsError) {
      throw new Error(`Failed to fetch dataset rows: ${rowsError.message}`);
    }

    return {
      ...dataset,
      columns: columns || [],
      rows: rows || []
    };
  }

  /**
   * List all datasets with pagination
   */
  async list(page: number = 1, limit: number = 10, createdBy?: string): Promise<{
    datasets: Dataset[];
    total: number;
    page: number;
    limit: number;
  }> {
    let query = this.supabase
      .from(TABLES.DATASETS)
      .select('*', { count: 'exact' });

    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    const { data: datasets, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      throw new Error(`Failed to fetch datasets: ${error.message}`);
    }

    return {
      datasets: datasets || [],
      total: count || 0,
      page,
      limit
    };
  }

  /**
   * Update dataset
   */
  async update(id: string, updates: UpdateDatasetRequest): Promise<Dataset> {
    const { data: dataset, error } = await this.supabase
      .from(TABLES.DATASETS)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update dataset: ${error.message}`);
    }

    return dataset;
  }

  /**
   * Delete dataset and all related data
   */
  async delete(id: string): Promise<void> {
    // Delete in reverse order of dependencies
    await this.supabase.from(TABLES.DATASET_ROWS).delete().eq('dataset_id', id);
    await this.supabase.from(TABLES.DATASET_COLUMNS).delete().eq('dataset_id', id);
    await this.supabase.from(TABLES.PREPROCESSING_JOBS).delete().eq('dataset_id', id);
    
    const { error } = await this.supabase
      .from(TABLES.DATASETS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete dataset: ${error.message}`);
    }
  }

  /**
   * Update dataset rows
   */
  async updateRows(datasetId: string, rows: Array<{ id?: string; data: Record<string, any>; rowIndex: number }>): Promise<void> {
    // Delete existing rows
    await this.supabase.from(TABLES.DATASET_ROWS).delete().eq('dataset_id', datasetId);

    // Insert new rows
    const rowsToInsert = rows.map((row, index) => ({
      id: row.id || uuidv4(),
      dataset_id: datasetId,
      row_index: row.rowIndex,
      data: row.data
    }));

    const { error } = await this.supabase
      .from(TABLES.DATASET_ROWS)
      .insert(rowsToInsert);

    if (error) {
      throw new Error(`Failed to update dataset rows: ${error.message}`);
    }

    // Update row count
    await this.supabase
      .from(TABLES.DATASETS)
      .update({ 
        row_count: rows.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', datasetId);
  }

  /**
   * Update dataset columns
   */
  async updateColumns(datasetId: string, columns: Array<{
    id?: string;
    name: string;
    displayName: string;
    dataType: 'text' | 'number' | 'date' | 'boolean';
    isRequired?: boolean;
    validationRules?: any;
  }>): Promise<void> {
    // Delete existing columns
    await this.supabase.from(TABLES.DATASET_COLUMNS).delete().eq('dataset_id', datasetId);

    // Insert new columns
    const columnsToInsert = columns.map((col, index) => ({
      id: col.id || uuidv4(),
      dataset_id: datasetId,
      name: col.name,
      display_name: col.displayName,
      data_type: col.dataType,
      is_required: col.isRequired || false,
      validation_rules: col.validationRules,
      order_index: index
    }));

    const { error } = await this.supabase
      .from(TABLES.DATASET_COLUMNS)
      .insert(columnsToInsert);

    if (error) {
      throw new Error(`Failed to update dataset columns: ${error.message}`);
    }

    // Update column count
    await this.supabase
      .from(TABLES.DATASETS)
      .update({ 
        column_count: columns.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', datasetId);
  }

  /**
   * Create preprocessing job
   */
  async createPreprocessingJob(datasetId: string, options: any): Promise<PreprocessingJob> {
    const { data: job, error } = await this.supabase
      .from(TABLES.PREPROCESSING_JOBS)
      .insert({
        id: uuidv4(),
        dataset_id: datasetId,
        status: 'queued',
        progress: 0,
        options
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create preprocessing job: ${error.message}`);
    }

    return job;
  }

  /**
   * Update preprocessing job
   */
  async updatePreprocessingJob(jobId: string, updates: {
    status?: PreprocessingJob['status'];
    progress?: number;
    result?: any;
    errorMessage?: string;
  }): Promise<PreprocessingJob> {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.status === 'processing' && !updates.progress) {
      updateData.started_at = new Date().toISOString();
    }

    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: job, error } = await this.supabase
      .from(TABLES.PREPROCESSING_JOBS)
      .update(updateData)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update preprocessing job: ${error.message}`);
    }

    return job;
  }

  /**
   * Get preprocessing job by ID
   */
  async getPreprocessingJob(jobId: string): Promise<PreprocessingJob | null> {
    const { data: job, error } = await this.supabase
      .from(TABLES.PREPROCESSING_JOBS)
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      return null;
    }

    return job;
  }
}