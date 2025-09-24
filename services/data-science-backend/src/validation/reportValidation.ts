import { AnalyticsData, ReportConfiguration, ReportMetadata } from '../types/reports';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ReportGenerationRequest {
  analyticsData: AnalyticsData;
  configuration: ReportConfiguration;
  metadata: ReportMetadata;
}

export function validateReportGeneration(request: ReportGenerationRequest): ValidationResult {
  const errors: string[] = [];

  // Validate analytics data
  if (!request.analyticsData) {
    errors.push('Analytics data is required');
  } else {
    const analyticsErrors = validateAnalyticsData(request.analyticsData);
    errors.push(...analyticsErrors);
  }

  // Validate configuration
  if (!request.configuration) {
    errors.push('Report configuration is required');
  } else {
    const configErrors = validateReportConfiguration(request.configuration);
    errors.push(...configErrors);
  }

  // Validate metadata
  if (!request.metadata) {
    errors.push('Report metadata is required');
  } else {
    const metadataErrors = validateReportMetadata(request.metadata);
    errors.push(...metadataErrors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateAnalyticsData(data: AnalyticsData): string[] {
  const errors: string[] = [];

  if (!data.modelPerformance || !Array.isArray(data.modelPerformance)) {
    errors.push('Model performance data is required and must be an array');
  } else if (data.modelPerformance.length === 0) {
    errors.push('At least one model performance record is required');
  } else {
    // Validate each model performance record
    data.modelPerformance.forEach((model, index) => {
      const modelErrors = validateModelMetrics(model, index);
      errors.push(...modelErrors);
    });
  }

  // Validate feature importance if provided
  if (data.featureImportance && typeof data.featureImportance !== 'object') {
    errors.push('Feature importance must be an object');
  }

  // Validate dataset info if provided
  if (data.datasetInfo) {
    const datasetErrors = validateDatasetInfo(data.datasetInfo);
    errors.push(...datasetErrors);
  }

  return errors;
}

function validateModelMetrics(model: any, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Model ${index + 1}`;

  if (!model.modelId || typeof model.modelId !== 'string') {
    errors.push(`${prefix}: modelId is required and must be a string`);
  }

  if (!model.modelType || typeof model.modelType !== 'string') {
    errors.push(`${prefix}: modelType is required and must be a string`);
  }

  // Validate numeric metrics
  const numericFields = ['accuracy', 'precision', 'recall', 'f1Score'];
  numericFields.forEach(field => {
    if (model[field] === undefined || model[field] === null) {
      errors.push(`${prefix}: ${field} is required`);
    } else if (typeof model[field] !== 'number' || isNaN(model[field])) {
      errors.push(`${prefix}: ${field} must be a valid number`);
    } else if (model[field] < 0 || model[field] > 1) {
      errors.push(`${prefix}: ${field} must be between 0 and 1`);
    }
  });

  // Validate optional AUC
  if (model.auc !== undefined && (typeof model.auc !== 'number' || model.auc < 0 || model.auc > 1)) {
    errors.push(`${prefix}: auc must be a number between 0 and 1`);
  }

  // Validate confusion matrix if provided
  if (model.confusionMatrix && !Array.isArray(model.confusionMatrix)) {
    errors.push(`${prefix}: confusionMatrix must be an array`);
  }

  return errors;
}

function validateDatasetInfo(info: any): string[] {
  const errors: string[] = [];

  const requiredNumericFields = ['totalSamples', 'featureCount', 'missingValues', 'qualityScore'];
  requiredNumericFields.forEach(field => {
    if (info[field] === undefined || info[field] === null) {
      errors.push(`Dataset info: ${field} is required`);
    } else if (typeof info[field] !== 'number' || isNaN(info[field])) {
      errors.push(`Dataset info: ${field} must be a valid number`);
    } else if (info[field] < 0) {
      errors.push(`Dataset info: ${field} must be non-negative`);
    }
  });

  // Quality score should be between 0 and 1
  if (info.qualityScore !== undefined && (info.qualityScore < 0 || info.qualityScore > 1)) {
    errors.push('Dataset info: qualityScore must be between 0 and 1');
  }

  return errors;
}

function validateReportConfiguration(config: ReportConfiguration): string[] {
  const errors: string[] = [];

  // Validate format
  const validFormats = ['pdf', 'html', 'docx'];
  if (!config.format || !validFormats.includes(config.format)) {
    errors.push(`Format must be one of: ${validFormats.join(', ')}`);
  }

  // Validate boolean fields
  if (typeof config.includeCharts !== 'boolean') {
    errors.push('includeCharts must be a boolean');
  }

  if (typeof config.includeRawData !== 'boolean') {
    errors.push('includeRawData must be a boolean');
  }

  // Validate sections
  if (!config.sections || !Array.isArray(config.sections)) {
    errors.push('sections must be an array');
  } else {
    config.sections.forEach((section, index) => {
      const sectionErrors = validateReportSection(section, index);
      errors.push(...sectionErrors);
    });
  }

  // Validate custom sections if provided
  if (config.customSections) {
    if (!Array.isArray(config.customSections)) {
      errors.push('customSections must be an array');
    } else {
      config.customSections.forEach((section, index) => {
        const customSectionErrors = validateCustomSection(section, index);
        errors.push(...customSectionErrors);
      });
    }
  }

  return errors;
}

function validateReportSection(section: any, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Section ${index + 1}`;

  if (!section.id || typeof section.id !== 'string') {
    errors.push(`${prefix}: id is required and must be a string`);
  }

  if (!section.name || typeof section.name !== 'string') {
    errors.push(`${prefix}: name is required and must be a string`);
  }

  if (typeof section.enabled !== 'boolean') {
    errors.push(`${prefix}: enabled must be a boolean`);
  }

  if (typeof section.order !== 'number' || section.order < 0) {
    errors.push(`${prefix}: order must be a non-negative number`);
  }

  return errors;
}

function validateCustomSection(section: any, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Custom section ${index + 1}`;

  if (!section.id || typeof section.id !== 'string') {
    errors.push(`${prefix}: id is required and must be a string`);
  }

  if (!section.title || typeof section.title !== 'string') {
    errors.push(`${prefix}: title is required and must be a string`);
  }

  if (!section.content || typeof section.content !== 'string') {
    errors.push(`${prefix}: content is required and must be a string`);
  }

  const validTypes = ['text', 'chart', 'table'];
  if (!section.type || !validTypes.includes(section.type)) {
    errors.push(`${prefix}: type must be one of: ${validTypes.join(', ')}`);
  }

  if (typeof section.order !== 'number' || section.order < 0) {
    errors.push(`${prefix}: order must be a non-negative number`);
  }

  return errors;
}

function validateReportMetadata(metadata: ReportMetadata): string[] {
  const errors: string[] = [];

  // Title is optional but if provided must be string
  if (metadata.title && typeof metadata.title !== 'string') {
    errors.push('Metadata title must be a string');
  }

  // Author is optional but if provided must be string
  if (metadata.author && typeof metadata.author !== 'string') {
    errors.push('Metadata author must be a string');
  }

  // Version is optional but if provided must be string
  if (metadata.version && typeof metadata.version !== 'string') {
    errors.push('Metadata version must be a string');
  }

  // Description is optional but if provided must be string
  if (metadata.description && typeof metadata.description !== 'string') {
    errors.push('Metadata description must be a string');
  }

  // Tags is optional but if provided must be array of strings
  if (metadata.tags) {
    if (!Array.isArray(metadata.tags)) {
      errors.push('Metadata tags must be an array');
    } else if (!metadata.tags.every(tag => typeof tag === 'string')) {
      errors.push('All metadata tags must be strings');
    }
  }

  return errors;
}

export function validateReportTemplate(template: any): ValidationResult {
  const errors: string[] = [];

  if (!template.name || typeof template.name !== 'string') {
    errors.push('Template name is required and must be a string');
  }

  if (!template.description || typeof template.description !== 'string') {
    errors.push('Template description is required and must be a string');
  }

  if (!template.sections || !Array.isArray(template.sections)) {
    errors.push('Template sections must be an array');
  } else if (template.sections.length === 0) {
    errors.push('Template must have at least one section');
  } else if (!template.sections.every((section: any) => typeof section === 'string')) {
    errors.push('All template sections must be strings');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}