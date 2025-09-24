export interface AnalyticsData {
  modelPerformance: ModelMetrics[];
  featureImportance?: { [feature: string]: number };
  datasetInfo?: {
    totalSamples: number;
    featureCount: number;
    missingValues: number;
    qualityScore: number;
  };
  dataDistributions?: DistributionData;
  predictionAnalysis?: PredictionAnalysisData;
  comparisonMetrics?: ModelComparisonData;
}

export interface ModelMetrics {
  modelId: string;
  modelType: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc?: number;
  confusionMatrix?: number[][];
  trainingTime?: number;
}

export interface DistributionData {
  features: { [feature: string]: FeatureDistribution };
  correlations?: { [pair: string]: number };
}

export interface FeatureDistribution {
  type: 'numerical' | 'categorical';
  values: number[] | string[];
  counts?: number[];
  statistics?: {
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
  };
}

export interface PredictionAnalysisData {
  residuals?: number[];
  predictedVsActual?: Array<{ predicted: number; actual: number }>;
  errorDistribution?: number[];
}

export interface ModelComparisonData {
  metrics: { [modelId: string]: ModelMetrics };
  rankings: { [metric: string]: string[] };
}

export interface ReportConfiguration {
  templateId?: string;
  format: 'pdf' | 'html' | 'docx';
  includeCharts: boolean;
  includeRawData: boolean;
  sections: ReportSection[];
  customSections?: CustomSection[];
  styling?: ReportStyling;
}

export interface ReportSection {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  config?: { [key: string]: any };
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'chart' | 'table';
  order: number;
}

export interface ReportStyling {
  theme: 'default' | 'dark' | 'minimal';
  primaryColor?: string;
  fontFamily?: string;
  fontSize?: number;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export interface ReportMetadata {
  reportId?: string;
  title?: string;
  author?: string;
  version?: string;
  description?: string;
  tags?: string[];
  createdAt?: Date;
}

export interface ReportStatus {
  reportId: string;
  status: 'generating' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  downloadUrl?: string;
}

export interface ReportFile {
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  styling?: ReportStyling;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReportHistory {
  reports: ReportHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReportHistoryItem {
  id: string;
  title: string;
  format: string;
  createdAt: Date;
  size: number;
  status: 'completed' | 'failed';
  downloadUrl?: string;
}