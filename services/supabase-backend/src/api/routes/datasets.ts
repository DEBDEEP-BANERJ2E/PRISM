import { Router, Request, Response, NextFunction } from 'express';
import { DatasetService } from '../../services/DatasetService';
import { logger } from '../../utils/logger';
import Joi from 'joi';

const router = Router();
const datasetService = new DatasetService();

// Validation schemas
const createDatasetSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  description: Joi.string().optional().max(1000),
  fileName: Joi.string().optional(),
  fileSize: Joi.number().optional().min(0),
  columns: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      displayName: Joi.string().required(),
      dataType: Joi.string().valid('text', 'number', 'date', 'boolean').required(),
      isRequired: Joi.boolean().optional(),
      validationRules: Joi.object().optional()
    })
  ).required().min(1),
  rows: Joi.array().items(Joi.object()).required().min(1),
  metadata: Joi.object().optional(),
  createdBy: Joi.string().optional()
});

const updateDatasetSchema = Joi.object({
  name: Joi.string().optional().min(1).max(255),
  description: Joi.string().optional().max(1000),
  status: Joi.string().valid('uploading', 'processing', 'ready', 'error').optional(),
  metadata: Joi.object().optional()
});

const preprocessingOptionsSchema = Joi.object({
  cleanMissingValues: Joi.boolean().optional(),
  normalizeNumerical: Joi.boolean().optional(),
  encodeCategories: Joi.boolean().optional(),
  removeOutliers: Joi.boolean().optional(),
  featureSelection: Joi.boolean().optional()
});

// Middleware for validation
const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details
        },
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
};

// Create new dataset
router.post('/', validateBody(createDatasetSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataset = await datasetService.createDataset(req.body);
    
    res.status(201).json({
      success: true,
      data: dataset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// List datasets
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = req.query.userId as string;

    const result = await datasetService.listDatasets(page, limit, userId);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get dataset by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const dataset = await datasetService.getDataset(id);
    
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'DATASET_NOT_FOUND',
          message: 'Dataset not found'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: dataset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update dataset
router.put('/:id', validateBody(updateDatasetSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const dataset = await datasetService.updateDataset(id, req.body);
    
    res.json({
      success: true,
      data: dataset,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Delete dataset
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await datasetService.deleteDataset(id);
    
    res.json({
      success: true,
      message: 'Dataset deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update dataset rows
router.put('/:id/rows', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rows } = req.body;
    
    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ROWS',
          message: 'Rows must be an array'
        },
        timestamp: new Date().toISOString()
      });
    }

    await datasetService.updateDatasetRows(id, rows);
    
    res.json({
      success: true,
      message: 'Dataset rows updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update dataset schema
router.put('/:id/schema', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { columns } = req.body;
    
    if (!Array.isArray(columns)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COLUMNS',
          message: 'Columns must be an array'
        },
        timestamp: new Date().toISOString()
      });
    }

    await datasetService.updateDatasetSchema(id, columns);
    
    res.json({
      success: true,
      message: 'Dataset schema updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Start preprocessing
router.post('/:id/preprocess', validateBody(preprocessingOptionsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const options = req.body;
    
    const jobId = await datasetService.startPreprocessing(id, options);
    
    res.json({
      success: true,
      data: {
        jobId,
        message: 'Preprocessing started successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get preprocessing status
router.get('/preprocess/:jobId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const status = await datasetService.getPreprocessingStatus(jobId);
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as datasetsRouter };