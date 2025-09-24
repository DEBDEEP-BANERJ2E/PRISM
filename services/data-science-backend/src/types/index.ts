// Core data science workflow types

export interface RawDataset {
  id: string;
  name: string;
  description?: string;
  columns: ColumnDefinition[];
  rows: RowData[];
  metadata: {
    rowCount: number;
    columnCount: number;
    dataTypes: { [column: string]: 'text' | 'number' | 'date' | 'boolean' };
    uploadedAt: Date;
    fileSize?: number | undefined; // Allow undefined
    fileName?: string | undefined; // Allow undefined
  };
}

export interface PreprocessingStep {
  type: 'normalization' | 'encoding' | 'feature_selection' | 'outlier_removal' | 'missing_value_imputation';
  parameters: { [key: string]: any };
  appliedAt: Date;
}

export interface DataStatistics {
  mean: { [column: string]: number };
  std: { [column: string]: number };
  min: { [column: string]: number };
  max: { [column: string]: number };
  nullCount: { [column: string]: number };
  uniqueCount: { [column: string]: number };
}

export interface ProcessedDataset {
  id: string;
  originalData: RawDataset;
  features: number[][];
  labels: number[];
  featureNames: string[];
  preprocessing: {
    steps: PreprocessingStep[];
    statistics: DataStatistics;
    qualityScore: number;
  };
  metadata: {
    createdAt: Date;
    processedAt: Date;
    rowCount: number;
    featureCount: number;
  };
}

export interface ModelConfiguration {
  modelType: 'random_forest' | 'xgboost' | 'neural_network' | 'ensemble';
  hyperparameters: { [key: string]: any };
  trainingConfig: {
    trainTestSplit: number;
    validationStrategy: 'holdout' | 'k_fold' | 'stratified';
    crossValidationFolds?: number;
  };
  optimizationConfig: {
    useAutoOptimization: boolean;
    optimizationMethod?: 'grid_search' | 'random_search' | 'bayesian';
    parameterRanges?: { [key: string]: any[] };
  };
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  confusionMatrix: number[][];
  classificationReport: { [className: string]: { precision: number; recall: number; f1Score: number } };
}

export interface CrossValidationResult {
  folds: number;
  scores: number[];
  meanScore: number;
  stdScore: number;
  metrics: ModelMetrics[];
}

export interface TrainingMetrics {
  epoch?: number;
  loss: number;
  accuracy: number;
  validationLoss?: number;
  validationAccuracy?: number;
  timestamp: Date;
}

export interface TrainingResults {
  id: string;
  modelId: string;
  configuration: ModelConfiguration;
  metrics: {
    training: ModelMetrics;
    validation: CrossValidationResult;
    test: ModelMetrics;
  };
  featureImportance?: { [feature: string]: number };
  trainingTime: number;
  artifacts: {
    modelPath: string;
    configPath: string;
    metricsPath: string;
  };
  createdAt: Date;
}

export interface PredictionResult {
  id: string;
  input: { [feature: string]: any };
  prediction: number | string;
  confidence: number;
  probability?: number[];
  timestamp: Date;
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-1 scale
  factors: {
    factor: string;
    impact: number;
    confidence: number;
  }[];
  recommendations: string[];
  validUntil: Date;
}

export interface SensitivityAnalysis {
  parameters: {
    parameter: string;
    baseValue: any;
    testValues: any[];
    impacts: number[];
  }[];
  mostSensitiveParameters: string[];
  stabilityScore: number;
}

export interface ScenarioCondition {
  parameter: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'between';
  value: any;
  weight?: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  modelId: string;
  parameters: { [key: string]: any };
  conditions: ScenarioCondition[];
  results?: ScenarioResults;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioResults {
  scenarioId: string;
  predictions: PredictionResult[];
  riskAssessment: RiskAssessment;
  confidence: number;
  sensitivity: SensitivityAnalysis;
  recommendations: string[];
  executedAt: Date;
}

// Validation and error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface JobStatus {
  id: string;
  jobType?: 'data_preprocessing' | 'model_training' | 'scenario_execution' | 'report_generation';
  entityId?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  result?: any;
  error?: string | null;
  estimatedDurationSeconds?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Table data for manual input
export interface TableData {
  id: string;
  name: string;
  columns: ColumnDefinition[];
  rows: RowData[];
  metadata: {
    totalRows: number;
    totalColumns: number;
    lastUpdated: Date;
  };
}

export interface ColumnDefinition {
  id: string;
  name: string;
  displayName: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  isRequired: boolean;
  validationRules?: ValidationRules;
  orderIndex: number;
}

export interface RowData {
  id: string;
  rowIndex: number;
  data: Record<string, any>;
  isNew?: boolean;
  isModified?: boolean;
  isPending?: boolean;
}

export interface TableOperation {
  id: string;
  type: 'add_row' | 'update_cell' | 'delete_row' | 'add_column' | 'update_column' | 'delete_column';
  tableId: string;
  payload: any;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface TableChange {
  type: 'row_added' | 'row_updated' | 'row_deleted' | 'column_added' | 'column_updated' | 'column_deleted';
  tableId: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface ValidationRules {
  // Define validation rules structure as needed
  // Example:
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

// Report types
export interface ReportSection {
  id: string;
  type: 'summary' | 'charts' | 'data' | 'analysis' | 'recommendations';
  title: string;
  content: any;
  order: number;
}

export interface ReportConfiguration {
  sections: ReportSection[];
  format: 'pdf' | 'html' | 'docx';
  includeCharts: boolean;
  includeRawData: boolean;
  customSections?: ReportSection[];
}

export interface ReportMetadata {
  title: string;
  author: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
}

// Analytics types
export interface FeatureImportanceData {
  features: {
    name: string;
    importance: number;
    rank: number;
  }[];
  method: 'permutation' | 'shap' | 'built_in';
  totalFeatures: number;
}

export interface DistributionData {
  numerical: {
    [feature: string]: {
      histogram: { bins: number[]; counts: number[] };
      boxplot: { min: number; q1: number; median: number; q3: number; max: number; outliers: number[] };
      statistics: { mean: number; std: number; skewness: number; kurtosis: number };
    };
  };
  categorical: {
    [feature: string]: {
      counts: { [category: string]: number };
      percentages: { [category: string]: number };
    };
  };
  correlations: {
    matrix: number[][];
    features: string[];
    strongCorrelations: { feature1: string; feature2: string; correlation: number }[];
  };
}

export interface PredictionAnalysisData {
  residuals: {
    predicted: number[];
    actual: number[];
    residuals: number[];
  };
  predictionVsActual: {
    predicted: number[];
    actual: number[];
    r2Score: number;
    mse: number;
    mae: number;
  };
  errorDistribution: {
    bins: number[];
    counts: number[];
    statistics: { mean: number; std: number };
  };
}

export interface ModelComparisonData {
  models: {
    id: string;
    name: string;
    type: string;
    metrics: ModelMetrics;
    trainingTime: number;
    createdAt: Date;
  }[];
  comparison: {
    bestModel: string;
    metricComparison: {
      [metric: string]: {
        [modelId: string]: number;
      };
    };
    rankings: {
      [metric: string]: string[]; // Model IDs in order of performance
    };
  };
}

export interface AnalyticsData {
  modelPerformance: ModelMetrics;
  featureImportance: FeatureImportanceData;
  dataDistributions: DistributionData;
  predictionAnalysis: PredictionAnalysisData;
  trainingHistory: {
    epochs: number[];
    trainingLoss: number[];
    validationLoss: number[];
    trainingAccuracy: number[];
    validationAccuracy: number[];
  };
  modelInfo: {
    id: string;
    type: string;
    configuration: ModelConfiguration;
    trainingTime: number;
    datasetSize: number;
    createdAt: Date;
  };
}

// Export report types
export * from './reports';