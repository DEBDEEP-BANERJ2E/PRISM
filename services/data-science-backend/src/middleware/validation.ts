import { Request, Response, NextFunction } from 'express';
import { DataValidationError } from '../errors/DataScienceErrors';

/**
 * Middleware for basic request validation
 */
export function validateRequest(req: Request, _res: Response, next: NextFunction) {
  try {
    // Check if request has a body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (!req.body || Object.keys(req.body).length === 0) {
        throw new DataValidationError([{
          field: 'body',
          message: 'Request body is required',
          code: 'MISSING_BODY'
        }]);
      }
    }
    
    // Validate Content-Type for JSON requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
        !req.is('multipart/form-data') && 
        !req.is('application/json')) {
      throw new DataValidationError([{
        field: 'content-type',
        message: 'Content-Type must be application/json or multipart/form-data',
        code: 'INVALID_CONTENT_TYPE'
      }]);
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware for validating UUID parameters
 */
export function validateUUIDParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const paramValue = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!paramValue || !uuidRegex.test(paramValue)) {
      const error = new DataValidationError([{
        field: paramName,
        message: `${paramName} must be a valid UUID`,
        code: 'INVALID_UUID',
        value: paramValue
      }]);
      return next(error);
    }
    
    next();
  };
}

/**
 * Middleware for validating pagination parameters
 */
export function validatePagination(req: Request, _res: Response, next: NextFunction) {
  const { page, limit } = req.query;
  
  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      const error = new DataValidationError([{
        field: 'page',
        message: 'Page must be a positive integer',
        code: 'INVALID_PAGE',
        value: page
      }]);
      return next(error);
    }
  }
  
  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      const error = new DataValidationError([{
        field: 'limit',
        message: 'Limit must be a positive integer between 1 and 100',
        code: 'INVALID_LIMIT',
        value: limit
      }]);
      return next(error);
    }
  }
  
  next();
}

/**
 * Middleware for sanitizing input data
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  // Recursively sanitize object properties
  function sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      // Basic XSS prevention - remove script tags and javascript: protocols
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  }
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
}