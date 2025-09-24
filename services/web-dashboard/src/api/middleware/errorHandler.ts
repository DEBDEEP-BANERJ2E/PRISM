import { Request, Response, NextFunction } from 'express';
import { DataScienceError } from '../errors/DataScienceErrors';
import { APIResponse } from '../../types/dataScience';

/**
 * Global error handler middleware for data science API routes
 */
export function dataScienceErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error for monitoring
  console.error('Data Science API Error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  // Handle known data science errors
  if (error instanceof DataScienceError) {
    const response: APIResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: (error as any).validationErrors || 
                (error as any).trainingLogs || 
                (error as any).details || 
                undefined
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(error.statusCode).json(response);
  }
  
  // Handle multer file upload errors
  if (error.name === 'MulterError') {
    const multerError = error as any; // Cast to any to access 'code'
    let message = 'File upload error';
    let code = 'FILE_UPLOAD_ERROR';
    
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds the maximum limit';
        code = 'FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        code = 'TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        code = 'UNEXPECTED_FILE';
        break;
    }
    
    const response: APIResponse = {
      success: false,
      error: {
        code,
        message,
        details: { multerCode: multerError.code }
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(400).json(response);
  }
  
  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    const response: APIResponse = {
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body'
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(400).json(response);
  }
  
  // Handle database connection errors
  if (error.message.includes('ECONNREFUSED') || error.message.includes('database')) {
    const response: APIResponse = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database connection error'
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(503).json(response);
  }
  
  // Handle generic errors
  const response: APIResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: import.meta.env.PROD
        ? 'An unexpected error occurred'
        : error.message
    },
    timestamp: new Date().toISOString()
  };

  res.status(500).json(response);
}

/**
 * 404 handler for data science routes
 */
export function notFoundHandler(req: Request, res: Response) {
  const response: APIResponse = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    },
    timestamp: new Date().toISOString()
  };
  
  res.status(404).json(response);
}

/**
 * Async error wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}