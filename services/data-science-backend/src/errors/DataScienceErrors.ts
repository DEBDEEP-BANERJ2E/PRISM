import { ValidationError } from '../types';

/**
 * Base class for data science workflow errors
 */
export abstract class DataScienceError extends Error {
  abstract code: string;
  abstract statusCode: number;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when data validation fails
 */
export class DataValidationError extends DataScienceError {
  code = 'DATA_VALIDATION_ERROR';
  statusCode = 400;
  
  constructor(public validationErrors: ValidationError[]) {
    const message = `Data validation failed: ${validationErrors.map(e => e.message).join(', ')}`;
    super(message);
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when model training fails
 */
export class ModelTrainingError extends DataScienceError {
  code = 'MODEL_TRAINING_ERROR';
  statusCode = 422;
  
  constructor(public trainingLogs: string[]) {
    const message = `Model training failed: ${trainingLogs.join('; ')}`;
    super(message);
    this.trainingLogs = trainingLogs;
  }
}

/**
 * Error thrown when preprocessing fails
 */
export class PreprocessingError extends DataScienceError {
  code = 'PREPROCESSING_ERROR';
  statusCode = 422;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.details = details;
  }
}

/**
 * Error thrown when scenario execution fails
 */
export class ScenarioExecutionError extends DataScienceError {
  code = 'SCENARIO_EXECUTION_ERROR';
  statusCode = 422;
  
  constructor(message: string, public scenarioId?: string) {
    super(message);
    this.scenarioId = scenarioId;
  }
}

/**
 * Error thrown when report generation fails
 */
export class ReportGenerationError extends DataScienceError {
  code = 'REPORT_GENERATION_ERROR';
  statusCode = 422;
  
  constructor(message: string, public reportType?: string) {
    super(message);
    this.reportType = reportType;
  }
}

/**
 * Error thrown when a resource is not found
 */
export class ResourceNotFoundError extends DataScienceError {
  code = 'RESOURCE_NOT_FOUND';
  statusCode = 404;
  
  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} with ID ${resourceId} not found`);
  }
}

/**
 * Error thrown when a job fails
 */
export class JobExecutionError extends DataScienceError {
  code = 'JOB_EXECUTION_ERROR';
  statusCode = 500;
  
  constructor(message: string, public jobId?: string, public jobType?: string) {
    super(message);
    this.jobId = jobId;
    this.jobType = jobType;
  }
}

/**
 * Error thrown when file operations fail
 */
export class FileOperationError extends DataScienceError {
  code = 'FILE_OPERATION_ERROR';
  statusCode = 500;
  
  constructor(operation: string, fileName?: string, details?: string) {
    const message = `File ${operation} failed${fileName ? ` for ${fileName}` : ''}${details ? `: ${details}` : ''}`;
    super(message);
  }
}