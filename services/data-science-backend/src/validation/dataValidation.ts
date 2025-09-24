import { ValidationError, ValidationResult, TableData, ModelConfiguration, Scenario } from '../types';

/**
 * Validates table data structure and content
 */
export function validateTableData(tableData: TableData): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check if headers exist and are valid
  if (!tableData.headers || !Array.isArray(tableData.headers)) {
    errors.push({
      field: 'headers',
      message: 'Headers must be provided as an array',
      code: 'INVALID_HEADERS'
    });
  } else {
    // Check for empty headers
    tableData.headers.forEach((header, index) => {
      if (!header || typeof header !== 'string' || header.trim() === '') {
        errors.push({
          field: `headers[${index}]`,
          message: 'Header cannot be empty',
          code: 'EMPTY_HEADER',
          value: header
        });
      }
    });
    
    // Check for duplicate headers
    const duplicateHeaders = tableData.headers.filter((header, index) => 
      tableData.headers.indexOf(header) !== index
    );
    if (duplicateHeaders.length > 0) {
      errors.push({
        field: 'headers',
        message: `Duplicate headers found: ${duplicateHeaders.join(', ')}`,
        code: 'DUPLICATE_HEADERS',
        value: duplicateHeaders
      });
    }
  }
  
  // Check if rows exist and are valid
  if (!tableData.rows || !Array.isArray(tableData.rows)) {
    errors.push({
      field: 'rows',
      message: 'Rows must be provided as an array',
      code: 'INVALID_ROWS'
    });
  } else {
    // Check if we have data
    if (tableData.rows.length === 0) {
      errors.push({
        field: 'rows',
        message: 'At least one row of data is required',
        code: 'NO_DATA_ROWS'
      });
    }
    
    // Validate each row
    const expectedColumnCount = tableData.headers?.length || 0;
    tableData.rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) {
        errors.push({
          field: `rows[${rowIndex}]`,
          message: 'Each row must be an array',
          code: 'INVALID_ROW_FORMAT',
          value: row
        });
      } else if (row.length !== expectedColumnCount) {
        errors.push({
          field: `rows[${rowIndex}]`,
          message: `Row has ${row.length} columns, expected ${expectedColumnCount}`,
          code: 'COLUMN_COUNT_MISMATCH',
          value: row.length
        });
      }
    });
  }
  
  // Validate metadata if provided
  if (tableData.metadata) {
    const { rowCount, columnCount, dataTypes } = tableData.metadata;
    
    if (typeof rowCount !== 'number' || rowCount < 0) {
      errors.push({
        field: 'metadata.rowCount',
        message: 'Row count must be a non-negative number',
        code: 'INVALID_ROW_COUNT',
        value: rowCount
      });
    }
    
    if (typeof columnCount !== 'number' || columnCount < 0) {
      errors.push({
        field: 'metadata.columnCount',
        message: 'Column count must be a non-negative number',
        code: 'INVALID_COLUMN_COUNT',
        value: columnCount
      });
    }
    
    // Validate data types
    if (dataTypes && tableData.headers) {
      const validDataTypes = ['string', 'number', 'date', 'boolean'];
      tableData.headers.forEach(header => {
        const dataType = dataTypes[header];
        if (dataType && !validDataTypes.includes(dataType)) {
          errors.push({
            field: `metadata.dataTypes.${header}`,
            message: `Invalid data type '${dataType}'. Must be one of: ${validDataTypes.join(', ')}`,
            code: 'INVALID_DATA_TYPE',
            value: dataType
          });
        }
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates model configuration
 */
export function validateModelConfiguration(config: ModelConfiguration): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate model type
  const validModelTypes = ['random_forest', 'xgboost', 'neural_network', 'ensemble'];
  if (!config.modelType || !validModelTypes.includes(config.modelType)) {
    errors.push({
      field: 'modelType',
      message: `Model type must be one of: ${validModelTypes.join(', ')}`,
      code: 'INVALID_MODEL_TYPE',
      value: config.modelType
    });
  }
  
  // Validate hyperparameters
  if (!config.hyperparameters || typeof config.hyperparameters !== 'object') {
    errors.push({
      field: 'hyperparameters',
      message: 'Hyperparameters must be provided as an object',
      code: 'INVALID_HYPERPARAMETERS'
    });
  }
  
  // Validate training configuration
  if (!config.trainingConfig) {
    errors.push({
      field: 'trainingConfig',
      message: 'Training configuration is required',
      code: 'MISSING_TRAINING_CONFIG'
    });
  } else {
    const { trainTestSplit, validationStrategy, crossValidationFolds } = config.trainingConfig;
    
    // Validate train/test split
    if (typeof trainTestSplit !== 'number' || trainTestSplit <= 0 || trainTestSplit >= 1) {
      errors.push({
        field: 'trainingConfig.trainTestSplit',
        message: 'Train/test split must be a number between 0 and 1',
        code: 'INVALID_TRAIN_TEST_SPLIT',
        value: trainTestSplit
      });
    }
    
    // Validate validation strategy
    const validStrategies = ['holdout', 'k_fold', 'stratified'];
    if (!validationStrategy || !validStrategies.includes(validationStrategy)) {
      errors.push({
        field: 'trainingConfig.validationStrategy',
        message: `Validation strategy must be one of: ${validStrategies.join(', ')}`,
        code: 'INVALID_VALIDATION_STRATEGY',
        value: validationStrategy
      });
    }
    
    // Validate cross-validation folds if k_fold is selected
    if (validationStrategy === 'k_fold') {
      if (!crossValidationFolds || typeof crossValidationFolds !== 'number' || crossValidationFolds < 2) {
        errors.push({
          field: 'trainingConfig.crossValidationFolds',
          message: 'Cross-validation folds must be a number >= 2 when using k_fold validation',
          code: 'INVALID_CV_FOLDS',
          value: crossValidationFolds
        });
      }
    }
  }
  
  // Validate optimization configuration
  if (!config.optimizationConfig) {
    errors.push({
      field: 'optimizationConfig',
      message: 'Optimization configuration is required',
      code: 'MISSING_OPTIMIZATION_CONFIG'
    });
  } else {
    const { useAutoOptimization, optimizationMethod, parameterRanges } = config.optimizationConfig;
    
    if (typeof useAutoOptimization !== 'boolean') {
      errors.push({
        field: 'optimizationConfig.useAutoOptimization',
        message: 'useAutoOptimization must be a boolean',
        code: 'INVALID_AUTO_OPTIMIZATION_FLAG',
        value: useAutoOptimization
      });
    }
    
    // If auto optimization is enabled, validate method and ranges
    if (useAutoOptimization) {
      const validMethods = ['grid_search', 'random_search', 'bayesian'];
      if (!optimizationMethod || !validMethods.includes(optimizationMethod)) {
        errors.push({
          field: 'optimizationConfig.optimizationMethod',
          message: `Optimization method must be one of: ${validMethods.join(', ')}`,
          code: 'INVALID_OPTIMIZATION_METHOD',
          value: optimizationMethod
        });
      }
      
      if (!parameterRanges || typeof parameterRanges !== 'object') {
        errors.push({
          field: 'optimizationConfig.parameterRanges',
          message: 'Parameter ranges must be provided when auto optimization is enabled',
          code: 'MISSING_PARAMETER_RANGES'
        });
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates scenario configuration
 */
export function validateScenario(scenario: Partial<Scenario>): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate required fields
  if (!scenario.name || typeof scenario.name !== 'string' || scenario.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Scenario name is required and cannot be empty',
      code: 'INVALID_SCENARIO_NAME',
      value: scenario.name
    });
  }
  
  if (!scenario.modelId || typeof scenario.modelId !== 'string') {
    errors.push({
      field: 'modelId',
      message: 'Model ID is required',
      code: 'MISSING_MODEL_ID',
      value: scenario.modelId
    });
  }
  
  if (!scenario.parameters || typeof scenario.parameters !== 'object') {
    errors.push({
      field: 'parameters',
      message: 'Scenario parameters are required',
      code: 'MISSING_PARAMETERS'
    });
  }
  
  // Validate conditions if provided
  if (scenario.conditions) {
    if (!Array.isArray(scenario.conditions)) {
      errors.push({
        field: 'conditions',
        message: 'Conditions must be an array',
        code: 'INVALID_CONDITIONS_FORMAT'
      });
    } else {
      scenario.conditions.forEach((condition, index) => {
        if (!condition.parameter || typeof condition.parameter !== 'string') {
          errors.push({
            field: `conditions[${index}].parameter`,
            message: 'Condition parameter is required',
            code: 'MISSING_CONDITION_PARAMETER',
            value: condition.parameter
          });
        }
        
        const validOperators = ['equals', 'greater_than', 'less_than', 'between'];
        if (!condition.operator || !validOperators.includes(condition.operator)) {
          errors.push({
            field: `conditions[${index}].operator`,
            message: `Operator must be one of: ${validOperators.join(', ')}`,
            code: 'INVALID_CONDITION_OPERATOR',
            value: condition.operator
          });
        }
        
        if (condition.value === undefined || condition.value === null) {
          errors.push({
            field: `conditions[${index}].value`,
            message: 'Condition value is required',
            code: 'MISSING_CONDITION_VALUE'
          });
        }
        
        // Validate weight if provided
        if (condition.weight !== undefined) {
          if (typeof condition.weight !== 'number' || condition.weight < 0 || condition.weight > 1) {
            errors.push({
              field: `conditions[${index}].weight`,
              message: 'Condition weight must be a number between 0 and 1',
              code: 'INVALID_CONDITION_WEIGHT',
              value: condition.weight
            });
          }
        }
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates file upload
 */
export function validateFileUpload(file: Express.Multer.File): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push({
      field: 'file',
      message: `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
      code: 'FILE_TOO_LARGE',
      value: file.size
    });
  }
  
  // Check file type
  const allowedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push({
      field: 'file',
      message: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      code: 'INVALID_FILE_TYPE',
      value: file.mimetype
    });
  }
  
  // Check file extension
  const allowedExtensions = ['.csv', '.xls', '.xlsx'];
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push({
      field: 'file',
      message: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
      code: 'INVALID_FILE_EXTENSION',
      value: fileExtension
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates numeric ranges
 */
export function validateNumericRange(value: number, min: number, max: number, fieldName: string): ValidationError | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be a valid number`,
      code: 'INVALID_NUMBER',
      value
    };
  }
  
  if (value < min || value > max) {
    return {
      field: fieldName,
      message: `${fieldName} must be between ${min} and ${max}`,
      code: 'OUT_OF_RANGE',
      value
    };
  }
  
  return null;
}

/**
 * Validates required string fields
 */
export function validateRequiredString(value: any, fieldName: string, minLength = 1): ValidationError | null {
  if (typeof value !== 'string') {
    return {
      field: fieldName,
      message: `${fieldName} is required and must be a string`,
      code: 'INVALID_STRING',
      value
    };
  }
  
  if (value.trim().length < minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${minLength} character(s) long`,
      code: 'STRING_TOO_SHORT',
      value: value.length
    };
  }
  
  return null;
}