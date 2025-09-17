import { z } from 'zod';
import { SpatialLocation, SpatialLocationSchema } from '../spatial';
import type { SpatialLocationInput } from '../spatial/SpatialLocation';
import { ConfidenceIntervalSchema, type ConfidenceInterval } from './RiskAssessment';

// Prediction type enumeration
export const PredictionTypeSchema = z.enum([
  'displacement', 'failure_probability', 'time_to_failure', 'stability_factor',
  'stress_distribution', 'deformation_rate', 'groundwater_level', 'temperature_trend'
]);

export type PredictionType = z.infer<typeof PredictionTypeSchema>;

// Model type enumeration
export const ModelTypeSchema = z.enum([
  'statistical', 'machine_learning', 'physics_based', 'hybrid', 'ensemble'
]);

export type ModelType = z.infer<typeof ModelTypeSchema>;

// Feature importance schema
export const FeatureImportanceSchema = z.object({
  feature_name: z.string().min(1),
  importance_score: z.number().min(0).max(1),
  feature_value: z.number().optional(),
  feature_unit: z.string().optional(),
  contribution_direction: z.enum(['positive', 'negative', 'neutral']).optional()
});

export type FeatureImportance = z.infer<typeof FeatureImportanceSchema>;

// Model performance metrics schema
export const ModelPerformanceSchema = z.object({
  accuracy: z.number().min(0).max(1).optional(),
  precision: z.number().min(0).max(1).optional(),
  recall: z.number().min(0).max(1).optional(),
  f1_score: z.number().min(0).max(1).optional(),
  auc_roc: z.number().min(0).max(1).optional(),
  rmse: z.number().nonnegative().optional(),
  mae: z.number().nonnegative().optional(),
  r_squared: z.number().min(-1).max(1).optional(),
  cross_validation_score: z.number().min(0).max(1).optional(),
  training_samples: z.number().int().positive().optional(),
  validation_samples: z.number().int().positive().optional()
});

export type ModelPerformance = z.infer<typeof ModelPerformanceSchema>;

// Prediction result validation schema
export const PredictionResultSchema = z.object({
  prediction_id: z.string().min(1),
  timestamp: z.date(),
  location: SpatialLocationSchema.optional(),
  prediction_type: PredictionTypeSchema,
  predicted_value: z.number(),
  predicted_unit: z.string(),
  confidence_interval: ConfidenceIntervalSchema,
  prediction_horizon_hours: z.number().positive(),
  model_type: ModelTypeSchema,
  model_name: z.string().min(1),
  model_version: z.string().optional(),
  feature_importance: z.array(FeatureImportanceSchema).default([]),
  model_performance: ModelPerformanceSchema.optional(),
  input_features: z.record(z.string(), z.any()).default({}),
  preprocessing_steps: z.array(z.string()).default([]),
  uncertainty_sources: z.array(z.string()).default([]),
  validation_status: z.enum(['validated', 'pending', 'failed', 'outdated']).default('pending'),
  actual_value: z.number().optional(),
  actual_timestamp: z.date().optional(),
  prediction_error: z.number().optional(),
  explanation: z.string().optional(),
  related_predictions: z.array(z.string()).default([]),
  data_quality_score: z.number().min(0).max(1).optional(),
  computational_time_ms: z.number().nonnegative().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type PredictionResultData = z.infer<typeof PredictionResultSchema>;

// Input type for constructor
export type PredictionResultInput = Omit<PredictionResultData, 'location' | 'feature_importance' | 'input_features' | 'preprocessing_steps' | 'uncertainty_sources' | 'validation_status' | 'related_predictions'> & {
  location?: SpatialLocationInput;
  feature_importance?: FeatureImportance[];
  input_features?: Record<string, any>;
  preprocessing_steps?: string[];
  uncertainty_sources?: string[];
  validation_status?: 'validated' | 'pending' | 'failed' | 'outdated';
  related_predictions?: string[];
};

export class PredictionResult {
  public readonly prediction_id: string;
  public readonly timestamp: Date;
  public readonly location?: SpatialLocation;
  public readonly prediction_type: PredictionType;
  public readonly predicted_value: number;
  public readonly predicted_unit: string;
  public readonly confidence_interval: ConfidenceInterval;
  public readonly prediction_horizon_hours: number;
  public readonly model_type: ModelType;
  public readonly model_name: string;
  public readonly model_version?: string;
  public readonly feature_importance: FeatureImportance[];
  public readonly model_performance?: ModelPerformance;
  public readonly input_features: Record<string, any>;
  public readonly preprocessing_steps: string[];
  public readonly uncertainty_sources: string[];
  public readonly validation_status: 'validated' | 'pending' | 'failed' | 'outdated';
  public readonly actual_value?: number;
  public readonly actual_timestamp?: Date;
  public readonly prediction_error?: number;
  public readonly explanation?: string;
  public readonly related_predictions: string[];
  public readonly data_quality_score?: number;
  public readonly computational_time_ms?: number;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  constructor(data: PredictionResultInput) {
    const validated = PredictionResultSchema.parse({
      ...data,
      location: data.location,
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date()
    });
    
    this.prediction_id = validated.prediction_id;
    this.timestamp = validated.timestamp;
    this.location = validated.location ? new SpatialLocation(validated.location) : undefined;
    this.prediction_type = validated.prediction_type;
    this.predicted_value = validated.predicted_value;
    this.predicted_unit = validated.predicted_unit;
    this.confidence_interval = validated.confidence_interval;
    this.prediction_horizon_hours = validated.prediction_horizon_hours;
    this.model_type = validated.model_type;
    this.model_name = validated.model_name;
    this.model_version = validated.model_version;
    this.feature_importance = validated.feature_importance;
    this.model_performance = validated.model_performance;
    this.input_features = validated.input_features;
    this.preprocessing_steps = validated.preprocessing_steps;
    this.uncertainty_sources = validated.uncertainty_sources;
    this.validation_status = validated.validation_status;
    this.actual_value = validated.actual_value;
    this.actual_timestamp = validated.actual_timestamp;
    this.prediction_error = validated.prediction_error;
    this.explanation = validated.explanation;
    this.related_predictions = validated.related_predictions;
    this.data_quality_score = validated.data_quality_score;
    this.computational_time_ms = validated.computational_time_ms;
    this.created_at = validated.created_at;
    this.updated_at = validated.updated_at;
  }

  /**
   * Check if the prediction is still valid (within horizon)
   */
  public isValid(): boolean {
    const hoursElapsed = (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
    return hoursElapsed <= this.prediction_horizon_hours;
  }

  /**
   * Check if the prediction has been validated with actual data
   */
  public isValidated(): boolean {
    return this.validation_status === 'validated' && 
           this.actual_value !== undefined && 
           this.actual_timestamp !== undefined;
  }

  /**
   * Calculate prediction accuracy (if actual value is available)
   */
  public getAccuracy(): number | undefined {
    if (!this.isValidated() || this.actual_value === undefined) return undefined;
    
    const error = Math.abs(this.predicted_value - this.actual_value);
    const range = Math.abs(this.actual_value) || 1; // Avoid division by zero
    return Math.max(0, 1 - (error / range));
  }

  /**
   * Calculate absolute prediction error
   */
  public getAbsoluteError(): number | undefined {
    if (!this.isValidated() || this.actual_value === undefined) return undefined;
    return Math.abs(this.predicted_value - this.actual_value);
  }

  /**
   * Calculate relative prediction error (percentage)
   */
  public getRelativeError(): number | undefined {
    if (!this.isValidated() || this.actual_value === undefined) return undefined;
    if (this.actual_value === 0) return undefined; // Avoid division by zero
    
    return Math.abs(this.predicted_value - this.actual_value) / Math.abs(this.actual_value);
  }

  /**
   * Check if prediction is within confidence interval
   */
  public isWithinConfidenceInterval(): boolean | undefined {
    if (!this.isValidated() || this.actual_value === undefined) return undefined;
    
    return this.actual_value >= this.confidence_interval.lower && 
           this.actual_value <= this.confidence_interval.upper;
  }

  /**
   * Get confidence level as percentage
   */
  public getConfidenceLevel(): number {
    return this.confidence_interval.confidence_level * 100;
  }

  /**
   * Get confidence interval width
   */
  public getConfidenceWidth(): number {
    return this.confidence_interval.upper - this.confidence_interval.lower;
  }

  /**
   * Get top feature importance factors
   */
  public getTopFeatures(limit: number = 5): FeatureImportance[] {
    return this.feature_importance
      .sort((a, b) => b.importance_score - a.importance_score)
      .slice(0, limit);
  }

  /**
   * Get prediction age in hours
   */
  public getAgeHours(): number {
    return (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Get remaining valid time in hours
   */
  public getRemainingValidHours(): number {
    return Math.max(0, this.prediction_horizon_hours - this.getAgeHours());
  }

  /**
   * Check if prediction is stale (beyond horizon)
   */
  public isStale(): boolean {
    return !this.isValid();
  }

  /**
   * Get uncertainty score (0-1, higher means more uncertain)
   */
  public getUncertaintyScore(): number {
    let uncertainty = 0;
    
    // Confidence interval width contributes to uncertainty
    const normalizedWidth = this.getConfidenceWidth() / Math.abs(this.predicted_value || 1);
    uncertainty += Math.min(0.5, normalizedWidth);
    
    // Number of uncertainty sources
    uncertainty += Math.min(0.3, this.uncertainty_sources.length * 0.1);
    
    // Data quality (inverse relationship)
    if (this.data_quality_score !== undefined) {
      uncertainty += (1 - this.data_quality_score) * 0.2;
    }
    
    return Math.min(1, uncertainty);
  }

  /**
   * Validate prediction result data
   */
  public static validate(data: unknown): PredictionResultData {
    return PredictionResultSchema.parse(data);
  }

  /**
   * Create prediction summary for dashboard
   */
  public getSummary(): {
    prediction_id: string;
    prediction_type: PredictionType;
    predicted_value: number;
    predicted_unit: string;
    confidence_level: number;
    model_name: string;
    age_hours: number;
    remaining_valid_hours: number;
    uncertainty_score: number;
    is_validated: boolean;
    accuracy?: number;
    top_features: string[];
  } {
    return {
      prediction_id: this.prediction_id,
      prediction_type: this.prediction_type,
      predicted_value: this.predicted_value,
      predicted_unit: this.predicted_unit,
      confidence_level: this.getConfidenceLevel(),
      model_name: this.model_name,
      age_hours: this.getAgeHours(),
      remaining_valid_hours: this.getRemainingValidHours(),
      uncertainty_score: this.getUncertaintyScore(),
      is_validated: this.isValidated(),
      accuracy: this.getAccuracy(),
      top_features: this.getTopFeatures(3).map(f => f.feature_name)
    };
  }

  /**
   * Convert to time series point for visualization
   */
  public toTimeSeriesPoint(): {
    timestamp: Date;
    value: number;
    confidence_lower: number;
    confidence_upper: number;
    model: string;
    type: PredictionType;
  } {
    return {
      timestamp: this.timestamp,
      value: this.predicted_value,
      confidence_lower: this.confidence_interval.lower,
      confidence_upper: this.confidence_interval.upper,
      model: this.model_name,
      type: this.prediction_type
    };
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): PredictionResultData {
    return {
      prediction_id: this.prediction_id,
      timestamp: this.timestamp,
      location: this.location?.toJSON(),
      prediction_type: this.prediction_type,
      predicted_value: this.predicted_value,
      predicted_unit: this.predicted_unit,
      confidence_interval: this.confidence_interval,
      prediction_horizon_hours: this.prediction_horizon_hours,
      model_type: this.model_type,
      model_name: this.model_name,
      model_version: this.model_version,
      feature_importance: this.feature_importance,
      model_performance: this.model_performance,
      input_features: this.input_features,
      preprocessing_steps: this.preprocessing_steps,
      uncertainty_sources: this.uncertainty_sources,
      validation_status: this.validation_status,
      actual_value: this.actual_value,
      actual_timestamp: this.actual_timestamp,
      prediction_error: this.prediction_error,
      explanation: this.explanation,
      related_predictions: this.related_predictions,
      data_quality_score: this.data_quality_score,
      computational_time_ms: this.computational_time_ms,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: any): PredictionResult {
    return new PredictionResult({
      ...json,
      timestamp: new Date(json.timestamp),
      actual_timestamp: json.actual_timestamp ? new Date(json.actual_timestamp) : undefined,
      created_at: json.created_at ? new Date(json.created_at) : undefined,
      updated_at: json.updated_at ? new Date(json.updated_at) : undefined
    });
  }
}