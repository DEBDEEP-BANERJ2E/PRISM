import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import axios from 'axios';
import { validateRequest } from '../middleware/validation';
import { DataValidationError } from '../errors/DataScienceErrors';
import { APIResponse, TableData, ValidationResult, RawDataset } from '../../types/dataScience';

const router = Router();

// Data Science Backend URL
const DATA_SCIENCE_BACKEND_URL = import.meta.env.VITE_DATA_SCIENCE_BACKEND_URL || 'http://localhost:3001';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Helper function to proxy requests to data science backend
async function proxyToDataScienceBackend(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  data?: any,
  files?: Express.Multer.File[]
): Promise<any> {
  try {
    const url = `${DATA_SCIENCE_BACKEND_URL}/api/datasets${path}`; // Changed to /api/datasets
    
    let requestConfig: any = {
      method,
      url,
      timeout: 30000, // 30 seconds
    };

    if (files && files.length > 0) {
      // Handle file uploads
      const FormData = require('form-data');
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('file', require('fs').createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype
        });
      });
      
      if (data) {
        Object.keys(data).forEach(key => {
          formData.append(key, typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
        });
      }
      
      requestConfig.data = formData;
      requestConfig.headers = formData.getHeaders();
    } else if (data) {
      requestConfig.data = data;
      requestConfig.headers = {
        'Content-Type': 'application/json'
      };
    }

    const response = await axios(requestConfig);
    return response.data;
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

// Data upload endpoint
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new DataValidationError([{
        field: 'file',
        message: 'No file uploaded',
        code: 'MISSING_FILE'
      }]);
    }

    // Proxy to data science backend
    const result = await proxyToDataScienceBackend('POST', '/upload', undefined, [req.file]);
    
    // Clean up uploaded file
    require('fs').unlinkSync(req.file.path);
    
    res.json(result);
  } catch (error) {
    // Clean up file on error
    if (req.file && require('fs').existsSync(req.file.path)) {
      require('fs').unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Manual data submission endpoint
router.post('/manual', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableData, metadata } = req.body as { tableData: TableData; metadata: any };

    if (!tableData || !tableData.columns || !tableData.rows) {
      throw new DataValidationError([{
        field: 'tableData',
        message: 'Invalid table data structure',
        code: 'INVALID_TABLE_DATA'
      }]);
    }

    // Proxy to data science backend
    const result = await proxyToDataScienceBackend('POST', '/manual', { tableData, metadata });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Trigger preprocessing
router.post('/:dataId/preprocess', validateRequest, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataId } = req.params;
    const { preprocessingConfig } = req.body;

    // Proxy to data science backend
    const result = await proxyToDataScienceBackend('POST', `/${dataId}/preprocess`, { preprocessingConfig });
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get preprocessing status
router.get('/preprocess/:jobId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    // Proxy to data science backend
    const result = await proxyToDataScienceBackend('GET', `/preprocess/${jobId}/status`);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// This file will no longer handle direct dataset CRUD operations.
// Those will be handled by TableSyncService.
// The /data routes will primarily be for file uploads and preprocessing.

// Get dataset by ID (still needed for preprocessing context)
router.get('/:dataId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dataId } = req.params;

    // Proxy to data science backend
    const result = await proxyToDataScienceBackend('GET', `/${dataId}`);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// List datasets (still needed for general data overview)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Proxy to data science backend
    const result = await proxyToDataScienceBackend('GET', '/');
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as dataRoutes };