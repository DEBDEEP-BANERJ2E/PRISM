import {
  DataValidationError,
  ModelTrainingError,
  PreprocessingError,
  ScenarioExecutionError,
  ReportGenerationError,
  ResourceNotFoundError,
  JobExecutionError,
  FileOperationError
} from '../../api/errors/DataScienceErrors';
import { ValidationError } from '../../types/dataScience';

describe('DataScienceErrors', () => {
  describe('DataValidationError', () => {
    it('should create error with validation errors', () => {
      const validationErrors: ValidationError[] = [
        {
          field: 'name',
          message: 'Name is required',
          code: 'REQUIRED_FIELD'
        },
        {
          field: 'email',
          message: 'Invalid email format',
          code: 'INVALID_FORMAT'
        }
      ];

      const error = new DataValidationError(validationErrors);

      expect(error.name).toBe('DataValidationError');
      expect(error.code).toBe('DATA_VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.message).toContain('Data validation failed');
      expect(error.message).toContain('Name is required');
      expect(error.message).toContain('Invalid email format');
    });

    it('should be instance of Error', () => {
      const error = new DataValidationError([]);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ModelTrainingError', () => {
    it('should create error with training logs', () => {
      const trainingLogs = [
        'Training started',
        'Epoch 1/10 - Loss: 0.5',
        'Error: Insufficient memory',
        'Training failed'
      ];

      const error = new ModelTrainingError(trainingLogs);

      expect(error.name).toBe('ModelTrainingError');
      expect(error.code).toBe('MODEL_TRAINING_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.trainingLogs).toEqual(trainingLogs);
      expect(error.message).toContain('Model training failed');
      expect(error.message).toContain('Training started');
    });
  });

  describe('PreprocessingError', () => {
    it('should create error with details', () => {
      const details = { step: 'normalization', reason: 'Invalid data range' };
      const error = new PreprocessingError('Preprocessing failed', details);

      expect(error.name).toBe('PreprocessingError');
      expect(error.code).toBe('PREPROCESSING_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual(details);
      expect(error.message).toBe('Preprocessing failed');
    });

    it('should create error without details', () => {
      const error = new PreprocessingError('Preprocessing failed');

      expect(error.details).toBeUndefined();
    });
  });

  describe('ScenarioExecutionError', () => {
    it('should create error with scenario ID', () => {
      const scenarioId = '123e4567-e89b-12d3-a456-426614174000';
      const error = new ScenarioExecutionError('Scenario execution failed', scenarioId);

      expect(error.name).toBe('ScenarioExecutionError');
      expect(error.code).toBe('SCENARIO_EXECUTION_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.scenarioId).toBe(scenarioId);
      expect(error.message).toBe('Scenario execution failed');
    });
  });

  describe('ReportGenerationError', () => {
    it('should create error with report type', () => {
      const reportType = 'PDF';
      const error = new ReportGenerationError('Report generation failed', reportType);

      expect(error.name).toBe('ReportGenerationError');
      expect(error.code).toBe('REPORT_GENERATION_ERROR');
      expect(error.statusCode).toBe(422);
      expect(error.reportType).toBe(reportType);
      expect(error.message).toBe('Report generation failed');
    });
  });

  describe('ResourceNotFoundError', () => {
    it('should create error with resource type and ID', () => {
      const error = new ResourceNotFoundError('Dataset', '123');

      expect(error.name).toBe('ResourceNotFoundError');
      expect(error.code).toBe('RESOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Dataset with ID 123 not found');
    });
  });

  describe('JobExecutionError', () => {
    it('should create error with job details', () => {
      const jobId = 'job-123';
      const jobType = 'model_training';
      const error = new JobExecutionError('Job failed', jobId, jobType);

      expect(error.name).toBe('JobExecutionError');
      expect(error.code).toBe('JOB_EXECUTION_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.jobId).toBe(jobId);
      expect(error.jobType).toBe(jobType);
      expect(error.message).toBe('Job failed');
    });
  });

  describe('FileOperationError', () => {
    it('should create error with operation details', () => {
      const error = new FileOperationError('upload', 'test.csv', 'Permission denied');

      expect(error.name).toBe('FileOperationError');
      expect(error.code).toBe('FILE_OPERATION_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('File upload failed for test.csv: Permission denied');
    });

    it('should create error without file name', () => {
      const error = new FileOperationError('delete', undefined, 'File not found');

      expect(error.message).toBe('File delete failed: File not found');
    });

    it('should create error without details', () => {
      const error = new FileOperationError('read', 'test.csv');

      expect(error.message).toBe('File read failed for test.csv');
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const error = new DataValidationError([]);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof DataValidationError).toBe(true);
      expect(error.constructor.name).toBe('DataValidationError');
    });

    it('should capture stack trace', () => {
      const error = new ModelTrainingError([]);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ModelTrainingError');
    });
  });
});