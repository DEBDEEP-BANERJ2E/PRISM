import { Router, Request, Response, NextFunction } from 'express';
import { DataValidationError } from '../../errors/DataScienceErrors';
import { APIResponse, RawDataset, ColumnDefinition, RowData } from '../../types';
import { supabaseServiceRole } from '../../services/supabaseClient';
import { logger } from '../../utils/logger';
import { randomUUID } from 'crypto';

const router = Router();

// Get dataset by ID
router.get('/:dataId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataId } = req.params;
    const dataset = await getDatasetById(dataId);

    if (!dataset) {
      throw new DataValidationError([{
        field: 'dataId',
        message: 'Dataset not found',
        code: 'DATASET_NOT_FOUND',
        value: dataId
      }]);
    }

    const response: APIResponse = {
      success: true,
      data: dataset,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// List datasets
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { data, error } = await supabaseServiceRole
      .from('datasets')
      .select('*');

    if (error) {
      logger.error('Error listing datasets:', error);
      throw new Error(`Failed to list datasets: ${error.message}`);
    }

    const response: APIResponse = {
      success: true,
      data: {
        datasets: data,
        total: data.length,
        page: 1,
        limit: data.length
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Add a new row to a dataset
router.post('/:datasetId/rows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { datasetId } = req.params;
    const { rowData } = req.body as { rowData: Record<string, any> };

    if (!rowData) {
      throw new DataValidationError([{
        field: 'rowData',
        message: 'Row data is required',
        code: 'MISSING_ROW_DATA'
      }]);
    }

    const dataset = await getDatasetById(datasetId);
    if (!dataset) {
      throw new DataValidationError([{
        field: 'datasetId',
        message: 'Dataset not found',
        code: 'DATASET_NOT_FOUND',
        value: datasetId
      }]);
    }

    const { data, error } = await supabaseServiceRole
      .from('dataset_rows')
      .insert({
        dataset_id: datasetId,
        row_index: dataset.rows.length, // Append to the end
        data: rowData,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error adding row:', error);
      throw new Error(`Failed to add row: ${error.message}`);
    }

    // Update row count in datasets table
    await supabaseServiceRole
      .from('datasets')
      .update({ row_count: dataset.rows.length + 1, updated_at: new Date() })
      .eq('id', datasetId);

    const response: APIResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Update a single row in a dataset
router.put('/:datasetId/rows/:rowId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { datasetId, rowId } = req.params;
    const { updates } = req.body as { updates: Record<string, any> };

    if (!updates) {
      throw new DataValidationError([{
        field: 'updates',
        message: 'Updates are required',
        code: 'MISSING_UPDATES'
      }]);
    }

    const { data, error } = await supabaseServiceRole
      .from('dataset_rows')
      .update({ data: updates, updated_at: new Date() })
      .eq('dataset_id', datasetId)
      .eq('id', rowId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating row:', error);
      throw new Error(`Failed to update row: ${error.message}`);
    }

    if (!data) {
      throw new DataValidationError([{
        field: 'rowId',
        message: 'Row not found or not updated',
        code: 'ROW_NOT_FOUND',
        value: rowId
      }]);
    }

    const response: APIResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Delete a single row from a dataset
router.delete('/:datasetId/rows/:rowId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { datasetId, rowId } = req.params;

    const { error } = await supabaseServiceRole
      .from('dataset_rows')
      .delete()
      .eq('dataset_id', datasetId)
      .eq('id', rowId);

    if (error) {
      logger.error('Error deleting row:', error);
      throw new Error(`Failed to delete row: ${error.message}`);
    }

    // Update row count in datasets table
    const dataset = await getDatasetById(datasetId);
    if (dataset) {
      await supabaseServiceRole
        .from('datasets')
        .update({ row_count: dataset.rows.length - 1, updated_at: new Date() })
        .eq('id', datasetId);
    }

    const response: APIResponse = {
      success: true,
      data: { message: 'Row deleted successfully' },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Update a single cell value
router.put('/:datasetId/rows/:rowId/cells/:columnName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { datasetId, rowId, columnName } = req.params;
    const { value } = req.body as { value: any };

    const { data: existingRow, error: fetchError } = await supabaseServiceRole
      .from('dataset_rows')
      .select('data')
      .eq('dataset_id', datasetId)
      .eq('id', rowId)
      .single();

    if (fetchError) {
      logger.error('Error fetching row for cell update:', fetchError);
      throw new Error(`Failed to fetch row for cell update: ${fetchError.message}`);
    }

    if (!existingRow) {
      throw new DataValidationError([{
        field: 'rowId',
        message: 'Row not found',
        code: 'ROW_NOT_FOUND',
        value: rowId
      }]);
    }

    const updatedData = { ...existingRow.data, [columnName]: value };

    const { data, error } = await supabaseServiceRole
      .from('dataset_rows')
      .update({ data: updatedData, updated_at: new Date() })
      .eq('dataset_id', datasetId)
      .eq('id', rowId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating cell:', error);
      throw new Error(`Failed to update cell: ${error.message}`);
    }

    const response: APIResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Add a new column to a dataset
router.post('/:datasetId/columns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { datasetId } = req.params;
    const { column } = req.body as { column: ColumnDefinition };

    if (!column || !column.name || !column.dataType) {
      throw new DataValidationError([{
        field: 'column',
        message: 'Column name and data type are required',
        code: 'MISSING_COLUMN_DATA'
      }]);
    }

    const dataset = await getDatasetById(datasetId);
    if (!dataset) {
      throw new DataValidationError([{
        field: 'datasetId',
        message: 'Dataset not found',
        code: 'DATASET_NOT_FOUND',
        value: datasetId
      }]);
    }

    const { data, error } = await supabaseServiceRole
      .from('dataset_columns')
      .insert({
        dataset_id: datasetId,
        name: column.name,
        display_name: column.displayName || column.name,
        data_type: column.dataType,
        is_required: column.isRequired || false,
        validation_rules: column.validationRules || {},
        order_index: dataset.columns.length, // Append to the end
      })
      .select()
      .single();

    if (error) {
      logger.error('Error adding column:', error);
      throw new Error(`Failed to add column: ${error.message}`);
    }

    // Update column count in datasets table
    await supabaseServiceRole
      .from('datasets')
      .update({ column_count: dataset.columns.length + 1, updated_at: new Date() })
      .eq('id', datasetId);

    // For existing rows, add the new column with a default value (e.g., null)
    const { error: updateRowsError } = await supabaseServiceRole
      .from('dataset_rows')
      .update({
        data: { [column.name]: null }, // Add new column with null value
        updated_at: new Date()
      })
      .eq('dataset_id', datasetId);

    if (updateRowsError) {
      logger.error('Error updating existing rows with new column:', updateRowsError);
      // This might not be a critical error, but log it
    }

    const response: APIResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Update an existing column
router.put('/:datasetId/columns/:columnId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { datasetId, columnId } = req.params;
    const { updates } = req.body as { updates: Partial<ColumnDefinition> };

    if (!updates) {
      throw new DataValidationError([{
        field: 'updates',
        message: 'Updates are required',
        code: 'MISSING_UPDATES'
      }]);
    }

    const { data, error } = await supabaseServiceRole
      .from('dataset_columns')
      .update({ ...updates, updated_at: new Date() })
      .eq('dataset_id', datasetId)
      .eq('id', columnId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating column:', error);
      throw new Error(`Failed to update column: ${error.message}`);
    }

    if (!data) {
      throw new DataValidationError([{
        field: 'columnId',
        message: 'Column not found or not updated',
        code: 'COLUMN_NOT_FOUND',
        value: columnId
      }]);
    }

    const response: APIResponse = {
      success: true,
      data: data,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Delete a column
router.delete('/:datasetId/columns/:columnId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { datasetId, columnId } = req.params;

    const { data: columnToDelete, error: fetchColumnError } = await supabaseServiceRole
      .from('dataset_columns')
      .select('name')
      .eq('id', columnId)
      .single();

    if (fetchColumnError) {
      logger.error('Error fetching column to delete:', fetchColumnError);
      throw new Error(`Failed to fetch column to delete: ${fetchColumnError.message}`);
    }

    if (!columnToDelete) {
      throw new DataValidationError([{
        field: 'columnId',
        message: 'Column not found',
        code: 'COLUMN_NOT_FOUND',
        value: columnId
      }]);
    }

    const columnName = columnToDelete.name;

    const { error } = await supabaseServiceRole
      .from('dataset_columns')
      .delete()
      .eq('dataset_id', datasetId)
      .eq('id', columnId);

    if (error) {
      logger.error('Error deleting column:', error);
      throw new Error(`Failed to delete column: ${error.message}`);
    }

    // Update column count in datasets table
    const dataset = await getDatasetById(datasetId);
    if (dataset) {
      await supabaseServiceRole
        .from('datasets')
        .update({ column_count: dataset.columns.length - 1, updated_at: new Date() })
        .eq('id', datasetId);
    }

    // Remove the column from the 'data' JSONB of all rows
    const { error: updateRowsError } = await supabaseServiceRole
      .from('dataset_rows')
      .update({
        data: { [columnName]: null }, // Set to null first
        updated_at: new Date()
      })
      .eq('dataset_id', datasetId);

    if (updateRowsError) {
      logger.error('Error removing column from existing rows:', updateRowsError);
      // This might not be a critical error, but log it
    }

    // Note: Supabase doesn't have a direct way to remove a key from JSONB
    // The above sets it to null. If a complete removal is needed,
    // a custom RPC function or a more complex update might be required.

    const response: APIResponse = {
      success: true,
      data: { message: 'Column deleted successfully' },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * Get dataset by ID
 */
async function getDatasetById(dataId: string): Promise<RawDataset | null> {
  logger.info('Getting dataset:', { dataId });

  const { data: datasetData, error: datasetError } = await supabaseServiceRole
    .from('datasets')
    .select('*')
    .eq('id', dataId)
    .single();

  if (datasetError) {
    logger.error('Error fetching dataset:', datasetError);
    return null;
  }

  if (!datasetData) {
    return null;
  }

  const { data: columnsData, error: columnsError } = await supabaseServiceRole
    .from('dataset_columns')
    .select('*')
    .eq('dataset_id', dataId)
    .order('order_index', { ascending: true });

  if (columnsError) {
    logger.error('Error fetching dataset columns:', columnsError);
    return null;
  }

  const { data: rowsData, error: rowsError } = await supabaseServiceRole
    .from('dataset_rows')
    .select('*')
    .eq('dataset_id', dataId)
    .order('row_index', { ascending: true });

  if (rowsError) {
    logger.error('Error fetching dataset rows:', rowsError);
    return null;
  }

  const dataTypes: { [column: string]: 'text' | 'number' | 'date' | 'boolean' } = {};
  columnsData.forEach((col: ColumnDefinition) => {
    dataTypes[col.name] = col.dataType;
  });

  const columns: ColumnDefinition[] = columnsData.map((col: any) => ({
    id: col.id,
    name: col.name,
    displayName: col.display_name,
    dataType: col.data_type,
    isRequired: col.is_required,
    validationRules: col.validation_rules,
    orderIndex: col.order_index,
  }));

  const rows: RowData[] = rowsData.map((row: any) => ({
    id: row.id,
    rowIndex: row.row_index,
    data: row.data,
    isNew: false,
    isModified: false,
    isPending: false,
  }));

  return {
    id: datasetData.id,
    name: datasetData.name,
    description: datasetData.description,
    columns: columns,
    rows: rows,
    metadata: {
      rowCount: datasetData.row_count,
      columnCount: datasetData.column_count,
      dataTypes: dataTypes,
      uploadedAt: new Date(datasetData.created_at),
      fileSize: datasetData.file_size || undefined, // Use actual file_size if available
      fileName: datasetData.file_name || undefined, // Use actual file_name if available
    }
  };
}

export { router as datasetRoutes };