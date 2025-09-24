import { describe, it, expect } from 'vitest';
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
import {
  validateTableData,
  validateModelConfiguration,
  validateScenario,
  validateFileUpload
} from '../../api/validation/dataValidation';
import { 
  ProcessedDataset, 
  TrainingResults, 
  ScenarioResults,
  TableData,
  ModelConfiguration,
  Scenario
} from '../../types/dataScience';

describe('Data Science Core Integration', () => {
  describe('Type System Integration', () => {
    it('should have all core data types defined', () => {
      // Test that all main types are properly exported and can be used
      const mockProcessedDataset: Partial<ProcessedDataset> = {
        id: 'test-id',
        features: [[1, 2, 3], [4, 5, 6]],
        labels: [0, 1],
        featureNames: ['feature1', 'feature2', 'feature3']
      };

      const mockTrainingResults: Partial<TrainingResults> = {
        id: 'training-id',
        modelId: 'model-id',
        trainingTime: 300
      };

      const mockScenarioResults: Partial<ScenarioResults> = {
        scenarioId: 'scenario-id',
        confidence: 0.85
      };

      expect(mockProcessedDataset.id).toBe('test-id');
      expect(mockTrainingResults.modelId).toBe('model-id');
      expect(mockScenarioResults.confidence).toBe(0.85);
    });
  });

  describe('Error System Integration', () => {
    it('should create and handle all error types', () => {
      const validationError = new DataValidationError([{
        field: 'test',
        message: 'Test error',
        code: 'TEST_ERROR'
      }]);

      const trainingError = new ModelTrainingError(['Training failed']);
      const preprocessingError = new PreprocessingError('Preprocessing failed');
      const scenarioError = new ScenarioExecutionError('Scenario failed');
      const reportError = new ReportGenerationError('Report failed');
      const notFoundError = new ResourceNotFoundError('Dataset', 'test-id');
      const jobError = new JobExecutionError('Job failed');
      const fileError = new FileOperationError('upload', 'test.csv');

      // Verify all errors are properly instantiated
      expect(validationError.code).toBe('DATA_VALIDATION_ERROR');
      expect(trainingError.code).toBe('MODEL_TRAINING_ERROR');
      expect(preprocessingError.code).toBe('PREPROCESSING_ERROR');
      expect(scenarioError.code).toBe('SCENARIO_EXECUTION_ERROR');
      expect(reportError.code).toBe('REPORT_GENERATION_ERROR');
      expect(notFoundError.code).toBe('RESOURCE_NOT_FOUND');
      expect(jobError.code).toBe('JOB_EXECUTION_ERROR');
      expect(fileError.code).toBe('FILE_OPERATION_ERROR');

      // Verify status codes
      expect(validationError.statusCode).toBe(400);
      expect(trainingError.statusCode).toBe(422);
      expect(notFoundError.statusCode).toBe(404);
      expect(jobError.statusCode).toBe(500);
    });
  });

  describe('Validation System Integration', () => {
    it('should validate complete workflow data', () => {
      // Test table data validation
      const validTableData: TableData = {
        headers: ['feature1', 'feature2', 'target'],
        rows: [
          [1, 2, 0],
          [3, 4, 1],
          [5, 6, 0]
        ],
        metadata: {
          rowCount: 3,
          columnCount: 3,
          dataTypes: {
            feature1: 'number',
            feature2: 'number',
            target: 'number'
          }
        }
      };

      const tableValidation = validateTableData(validTableData);
      expect(tableValidation.isValid).toBe(true);

      // Test model configuration validation
      const validModelConfig: ModelConfiguration = {
        modelType: 'random_forest',
        hyperparameters: {
          n_estimators: 100,
          max_depth: 10
        },
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'k_fold',
          crossValidationFolds: 5
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const modelValidation = validateModelConfiguration(validModelConfig);
      expect(modelValidation.isValid).toBe(true);

      // Test scenario validation
      const validScenario: Partial<Scenario> = {
        name: 'Test Scenario',
        modelId: '123e4567-e89b-12d3-a456-426614174000',
        parameters: {
          temperature: 25,
          humidity: 60
        },
        conditions: [
          {
            parameter: 'temperature',
            operator: 'greater_than',
            value: 20
          }
        ]
      };

      const scenarioValidation = validateScenario(validScenario);
      expect(scenarioValidation.isValid).toBe(true);
    });

    it('should handle validation errors consistently', () => {
      // Test invalid table data
      const invalidTableData: TableData = {
        headers: [], // Empty headers should fail
        rows: [],
        metadata: {
          rowCount: 0,
          columnCount: 0,
          dataTypes: {}
        }
      };

      const tableValidation = validateTableData(invalidTableData);
      expect(tableValidation.isValid).toBe(false);
      expect(tableValidation.errors.length).toBeGreaterThan(0);

      // Test invalid model configuration
      const invalidModelConfig = {
        modelType: 'invalid_model', // Invalid model type
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 1.5, // Invalid split ratio
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      } as ModelConfiguration;

      const modelValidation = validateModelConfiguration(invalidModelConfig);
      expect(modelValidation.isValid).toBe(false);
      expect(modelValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('File Upload Integration', () => {
    it('should validate file uploads correctly', () => {
      const validFile = {
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 1024 * 1024 // 1MB
      } as Express.Multer.File;

      const validation = validateFileUpload(validFile);
      expect(validation.isValid).toBe(true);

      const invalidFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024
      } as Express.Multer.File;

      const invalidValidation = validateFileUpload(invalidFile);
      expect(invalidValidation.isValid).toBe(false);
      expect(invalidValidation.errors.some(e => e.code === 'INVALID_FILE_TYPE')).toBe(true);
    });
  });

  describe('End-to-End Workflow Validation', () => {
    it('should support complete data science workflow', () => {
      // 1. Data Input - validate table data
      const inputData: TableData = {
        headers: ['x1', 'x2', 'y'],
        rows: [[1, 2, 0], [3, 4, 1]],
        metadata: {
          rowCount: 2,
          columnCount: 3,
          dataTypes: { x1: 'number', x2: 'number', y: 'number' }
        }
      };
      
      const dataValidation = validateTableData(inputData);
      expect(dataValidation.isValid).toBe(true);

      // 2. Model Configuration - validate training setup
      const modelConfig: ModelConfiguration = {
        modelType: 'random_forest',
        hyperparameters: { n_estimators: 100 },
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const configValidation = validateModelConfiguration(modelConfig);
      expect(configValidation.isValid).toBe(true);

      // 3. Scenario Planning - validate scenario setup
      const scenario: Partial<Scenario> = {
        name: 'Production Scenario',
        modelId: '123e4567-e89b-12d3-a456-426614174000',
        parameters: { x1: 5, x2: 6 }
      };

      const scenarioValidation = validateScenario(scenario);
      expect(scenarioValidation.isValid).toBe(true);

      // All validations should pass for a complete workflow
      expect(dataValidation.isValid && configValidation.isValid && scenarioValidation.isValid).toBe(true);
    });
  });
});