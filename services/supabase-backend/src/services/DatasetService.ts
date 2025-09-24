import { DatasetModel, CreateDatasetRequest, UpdateDatasetRequest, Dataset } from '../models/Dataset';
import { logger } from '../utils/logger';

export class DatasetService {
  private datasetModel = new DatasetModel();

  /**
   * Create a new dataset from uploaded data
   */
  async createDataset(data: CreateDatasetRequest): Promise<Dataset> {
    try {
      logger.info('Creating new dataset', { 
        name: data.name, 
        rowCount: data.rows.length, 
        columnCount: data.columns.length 
      });

      // Validate data
      this.validateDatasetData(data);

      // Create dataset
      const dataset = await this.datasetModel.create(data);

      logger.info('Dataset created successfully', { id: dataset.id, name: dataset.name });
      return dataset;
    } catch (error) {
      logger.error('Failed to create dataset', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Get dataset by ID with full data
   */
  async getDataset(id: string): Promise<Dataset & { columns: any[]; rows: any[] } | null> {
    try {
      const dataset = await this.datasetModel.getById(id);
      
      if (!dataset) {
        logger.warn('Dataset not found', { id });
        return null;
      }

      logger.info('Dataset retrieved', { id, name: dataset.name });
      return dataset;
    } catch (error) {
      logger.error('Failed to get dataset', { id, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * List datasets with pagination
   */
  async listDatasets(page: number = 1, limit: number = 10, userId?: string) {
    try {
      const result = await this.datasetModel.list(page, limit, userId);
      
      logger.info('Datasets listed', { 
        page, 
        limit, 
        total: result.total, 
        count: result.datasets.length 
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to list datasets', { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Update dataset metadata
   */
  async updateDataset(id: string, updates: UpdateDatasetRequest): Promise<Dataset> {
    try {
      const dataset = await this.datasetModel.update(id, updates);
      
      logger.info('Dataset updated', { id, updates });
      return dataset;
    } catch (error) {
      logger.error('Failed to update dataset', { id, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Delete dataset
   */
  async deleteDataset(id: string): Promise<void> {
    try {
      await this.datasetModel.delete(id);
      
      logger.info('Dataset deleted', { id });
    } catch (error) {
      logger.error('Failed to delete dataset', { id, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Update dataset rows
   */
  async updateDatasetRows(datasetId: string, rows: Array<{ id?: string; data: Record<string, any>; rowIndex: number }>): Promise<void> {
    try {
      await this.datasetModel.updateRows(datasetId, rows);
      
      logger.info('Dataset rows updated', { datasetId, rowCount: rows.length });
    } catch (error) {
      logger.error('Failed to update dataset rows', { datasetId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Update dataset columns/schema
   */
  async updateDatasetSchema(datasetId: string, columns: Array<{
    id?: string;
    name: string;
    displayName: string;
    dataType: 'text' | 'number' | 'date' | 'boolean';
    isRequired?: boolean;
    validationRules?: any;
  }>): Promise<void> {
    try {
      await this.datasetModel.updateColumns(datasetId, columns);
      
      logger.info('Dataset schema updated', { datasetId, columnCount: columns.length });
    } catch (error) {
      logger.error('Failed to update dataset schema', { datasetId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Start preprocessing job
   */
  async startPreprocessing(datasetId: string, options: any): Promise<string> {
    try {
      const job = await this.datasetModel.createPreprocessingJob(datasetId, options);
      
      logger.info('Preprocessing job created', { jobId: job.id, datasetId });
      
      // Start processing (in a real implementation, this would be queued)
      this.processDatasetAsync(job.id, datasetId, options);
      
      return job.id;
    } catch (error) {
      logger.error('Failed to start preprocessing', { datasetId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Get preprocessing job status
   */
  async getPreprocessingStatus(jobId: string) {
    try {
      const job = await this.datasetModel.getPreprocessingJob(jobId);
      
      if (!job) {
        throw new Error('Preprocessing job not found');
      }

      return {
        status: job.status,
        progress: job.progress,
        result: job.result,
        error: job.error_message
      };
    } catch (error) {
      logger.error('Failed to get preprocessing status', { jobId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  /**
   * Process dataset asynchronously (simulate preprocessing)
   */
  private async processDatasetAsync(jobId: string, datasetId: string, options: any): Promise<void> {
    try {
      // Update job to processing
      await this.datasetModel.updatePreprocessingJob(jobId, {
        status: 'processing',
        progress: 10
      });

      // Simulate processing steps
      await this.sleep(1000);
      await this.datasetModel.updatePreprocessingJob(jobId, { progress: 30 });

      await this.sleep(1000);
      await this.datasetModel.updatePreprocessingJob(jobId, { progress: 60 });

      await this.sleep(1000);
      await this.datasetModel.updatePreprocessingJob(jobId, { progress: 90 });

      // Complete processing
      await this.sleep(500);
      await this.datasetModel.updatePreprocessingJob(jobId, {
        status: 'completed',
        progress: 100,
        result: {
          processedRows: 100,
          cleanedColumns: 5,
          normalizedFeatures: 3,
          encodedCategories: 2,
          summary: 'Data preprocessing completed successfully'
        }
      });

      logger.info('Preprocessing completed', { jobId, datasetId });
    } catch (error) {
      logger.error('Preprocessing failed', { jobId, datasetId, error: error instanceof Error ? error.message : error });
      
      await this.datasetModel.updatePreprocessingJob(jobId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate dataset data before creation
   */
  private validateDatasetData(data: CreateDatasetRequest): void {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Dataset name is required');
    }

    if (!data.columns || data.columns.length === 0) {
      throw new Error('Dataset must have at least one column');
    }

    if (!data.rows || data.rows.length === 0) {
      throw new Error('Dataset must have at least one row');
    }

    // Validate column names are unique
    const columnNames = data.columns.map(col => col.name);
    const uniqueNames = new Set(columnNames);
    if (columnNames.length !== uniqueNames.size) {
      throw new Error('Column names must be unique');
    }

    // Validate each row has data for all columns
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      for (const column of data.columns) {
        if (column.isRequired && (row[column.name] === undefined || row[column.name] === null || row[column.name] === '')) {
          throw new Error(`Row ${i + 1} is missing required value for column '${column.name}'`);
        }
      }
    }
  }

  /**
   * Helper function to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}