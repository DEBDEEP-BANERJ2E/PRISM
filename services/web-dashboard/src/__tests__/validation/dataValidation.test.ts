import {
  validateTableData,
  validateModelConfiguration,
  validateScenario,
  validateFileUpload,
  validateNumericRange,
  validateRequiredString
} from '../../api/validation/dataValidation';
import { TableData, ModelConfiguration, Scenario } from '../../types/dataScience';

describe('Data Validation', () => {
  describe('validateTableData', () => {
    it('should validate correct table data', () => {
      const validTableData: TableData = {
        headers: ['col1', 'col2', 'col3'],
        rows: [
          ['value1', 'value2', 'value3'],
          ['value4', 'value5', 'value6']
        ],
        metadata: {
          rowCount: 2,
          columnCount: 3,
          dataTypes: {
            col1: 'string',
            col2: 'string',
            col3: 'string'
          }
        }
      };

      const result = validateTableData(validTableData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject table data with missing headers', () => {
      const invalidTableData = {
        rows: [['value1', 'value2']],
        metadata: { rowCount: 1, columnCount: 2, dataTypes: {} }
      } as TableData;

      const result = validateTableData(invalidTableData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'headers',
          code: 'INVALID_HEADERS'
        })
      );
    });

    it('should reject table data with empty headers', () => {
      const invalidTableData: TableData = {
        headers: ['col1', '', 'col3'],
        rows: [['value1', 'value2', 'value3']],
        metadata: { rowCount: 1, columnCount: 3, dataTypes: {} }
      };

      const result = validateTableData(invalidTableData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'headers[1]',
          code: 'EMPTY_HEADER'
        })
      );
    });

    it('should reject table data with duplicate headers', () => {
      const invalidTableData: TableData = {
        headers: ['col1', 'col2', 'col1'],
        rows: [['value1', 'value2', 'value3']],
        metadata: { rowCount: 1, columnCount: 3, dataTypes: {} }
      };

      const result = validateTableData(invalidTableData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'headers',
          code: 'DUPLICATE_HEADERS'
        })
      );
    });

    it('should reject table data with no rows', () => {
      const invalidTableData: TableData = {
        headers: ['col1', 'col2'],
        rows: [],
        metadata: { rowCount: 0, columnCount: 2, dataTypes: {} }
      };

      const result = validateTableData(invalidTableData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'rows',
          code: 'NO_DATA_ROWS'
        })
      );
    });

    it('should reject table data with mismatched column counts', () => {
      const invalidTableData: TableData = {
        headers: ['col1', 'col2', 'col3'],
        rows: [
          ['value1', 'value2'], // Missing one column
          ['value3', 'value4', 'value5']
        ],
        metadata: { rowCount: 2, columnCount: 3, dataTypes: {} }
      };

      const result = validateTableData(invalidTableData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'rows[0]',
          code: 'COLUMN_COUNT_MISMATCH'
        })
      );
    });

    it('should reject invalid data types in metadata', () => {
      const invalidTableData: TableData = {
        headers: ['col1', 'col2'],
        rows: [['value1', 'value2']],
        metadata: {
          rowCount: 1,
          columnCount: 2,
          dataTypes: {
            col1: 'string',
            col2: 'invalid_type' as any
          }
        }
      };

      const result = validateTableData(invalidTableData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'metadata.dataTypes.col2',
          code: 'INVALID_DATA_TYPE'
        })
      );
    });
  });

  describe('validateModelConfiguration', () => {
    it('should validate correct model configuration', () => {
      const validConfig: ModelConfiguration = {
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
          useAutoOptimization: true,
          optimizationMethod: 'grid_search',
          parameterRanges: {
            n_estimators: [50, 100, 200],
            max_depth: [5, 10, 15]
          }
        }
      };

      const result = validateModelConfiguration(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid model type', () => {
      const invalidConfig = {
        modelType: 'invalid_model',
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      } as ModelConfiguration;

      const result = validateModelConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'modelType',
          code: 'INVALID_MODEL_TYPE'
        })
      );
    });

    it('should reject invalid train/test split', () => {
      const invalidConfig: ModelConfiguration = {
        modelType: 'random_forest',
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 1.5, // Invalid: > 1
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const result = validateModelConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'trainingConfig.trainTestSplit',
          code: 'INVALID_TRAIN_TEST_SPLIT'
        })
      );
    });

    it('should require cross-validation folds for k_fold strategy', () => {
      const invalidConfig: ModelConfiguration = {
        modelType: 'random_forest',
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'k_fold'
          // Missing crossValidationFolds
        },
        optimizationConfig: {
          useAutoOptimization: false
        }
      };

      const result = validateModelConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'trainingConfig.crossValidationFolds',
          code: 'INVALID_CV_FOLDS'
        })
      );
    });

    it('should require optimization method when auto optimization is enabled', () => {
      const invalidConfig: ModelConfiguration = {
        modelType: 'random_forest',
        hyperparameters: {},
        trainingConfig: {
          trainTestSplit: 0.8,
          validationStrategy: 'holdout'
        },
        optimizationConfig: {
          useAutoOptimization: true
          // Missing optimizationMethod and parameterRanges
        }
      };

      const result = validateModelConfiguration(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'optimizationConfig.optimizationMethod',
          code: 'INVALID_OPTIMIZATION_METHOD'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'optimizationConfig.parameterRanges',
          code: 'MISSING_PARAMETER_RANGES'
        })
      );
    });
  });

  describe('validateScenario', () => {
    it('should validate correct scenario', () => {
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
            value: 20,
            weight: 0.8
          }
        ]
      };

      const result = validateScenario(validScenario);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject scenario with missing name', () => {
      const invalidScenario: Partial<Scenario> = {
        modelId: '123e4567-e89b-12d3-a456-426614174000',
        parameters: {}
      };

      const result = validateScenario(invalidScenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          code: 'INVALID_SCENARIO_NAME'
        })
      );
    });

    it('should reject scenario with invalid condition operator', () => {
      const invalidScenario: Partial<Scenario> = {
        name: 'Test Scenario',
        modelId: '123e4567-e89b-12d3-a456-426614174000',
        parameters: {},
        conditions: [
          {
            parameter: 'temperature',
            operator: 'invalid_operator' as any,
            value: 20
          }
        ]
      };

      const result = validateScenario(invalidScenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].operator',
          code: 'INVALID_CONDITION_OPERATOR'
        })
      );
    });

    it('should reject scenario with invalid condition weight', () => {
      const invalidScenario: Partial<Scenario> = {
        name: 'Test Scenario',
        modelId: '123e4567-e89b-12d3-a456-426614174000',
        parameters: {},
        conditions: [
          {
            parameter: 'temperature',
            operator: 'equals',
            value: 20,
            weight: 1.5 // Invalid: > 1
          }
        ]
      };

      const result = validateScenario(invalidScenario);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'conditions[0].weight',
          code: 'INVALID_CONDITION_WEIGHT'
        })
      );
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct CSV file', () => {
      const validFile = {
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 1024 * 1024 // 1MB
      } as Express.Multer.File;

      const result = validateFileUpload(validFile);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file that is too large', () => {
      const invalidFile = {
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 60 * 1024 * 1024 // 60MB (exceeds 50MB limit)
      } as Express.Multer.File;

      const result = validateFileUpload(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'file',
          code: 'FILE_TOO_LARGE'
        })
      );
    });

    it('should reject invalid file type', () => {
      const invalidFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024
      } as Express.Multer.File;

      const result = validateFileUpload(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'file',
          code: 'INVALID_FILE_TYPE'
        })
      );
    });

    it('should reject invalid file extension', () => {
      const invalidFile = {
        originalname: 'test.txt',
        mimetype: 'text/csv', // Mimetype is correct but extension is wrong
        size: 1024
      } as Express.Multer.File;

      const result = validateFileUpload(invalidFile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'file',
          code: 'INVALID_FILE_EXTENSION'
        })
      );
    });
  });

  describe('validateNumericRange', () => {
    it('should validate number within range', () => {
      const result = validateNumericRange(5, 1, 10, 'testField');
      expect(result).toBeNull();
    });

    it('should reject non-numeric value', () => {
      const result = validateNumericRange('not a number' as any, 1, 10, 'testField');
      expect(result).toEqual(
        expect.objectContaining({
          field: 'testField',
          code: 'INVALID_NUMBER'
        })
      );
    });

    it('should reject number outside range', () => {
      const result = validateNumericRange(15, 1, 10, 'testField');
      expect(result).toEqual(
        expect.objectContaining({
          field: 'testField',
          code: 'OUT_OF_RANGE'
        })
      );
    });
  });

  describe('validateRequiredString', () => {
    it('should validate valid string', () => {
      const result = validateRequiredString('valid string', 'testField');
      expect(result).toBeNull();
    });

    it('should reject non-string value', () => {
      const result = validateRequiredString(123, 'testField');
      expect(result).toEqual(
        expect.objectContaining({
          field: 'testField',
          code: 'INVALID_STRING'
        })
      );
    });

    it('should reject string that is too short', () => {
      const result = validateRequiredString('ab', 'testField', 5);
      expect(result).toEqual(
        expect.objectContaining({
          field: 'testField',
          code: 'STRING_TOO_SHORT'
        })
      );
    });

    it('should reject empty string', () => {
      const result = validateRequiredString('', 'testField');
      expect(result).toEqual(
        expect.objectContaining({
          field: 'testField',
          code: 'STRING_TOO_SHORT'
        })
      );
    });
  });
});