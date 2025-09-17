import { z } from 'zod';
import { SpatialLocation, SpatialLocationSchema, Polygon, PolygonSchema } from '../spatial';
import type { SpatialLocationInput } from '../spatial/SpatialLocation';

// Risk level enumeration
export const RiskLevelSchema = z.enum(['very_low', 'low', 'medium', 'high', 'critical']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// Confidence interval schema
export const ConfidenceIntervalSchema = z.object({
  lower: z.number().min(0).max(1),
  upper: z.number().min(0).max(1),
  confidence_level: z.number().min(0).max(1).default(0.95) // 95% confidence by default
}).refine(data => data.lower <= data.upper, {
  message: "Lower bound must be less than or equal to upper bound"
});

export type ConfidenceInterval = z.infer<typeof ConfidenceIntervalSchema>;

// Contributing factor schema
export const ContributingFactorSchema = z.object({
  factor_name: z.string().min(1),
  importance: z.number().min(0).max(1), // 0-1 scale
  description: z.string().optional(),
  measurement_value: z.number().optional(),
  measurement_unit: z.string().optional(),
  threshold_exceeded: z.boolean().default(false)
});

export type ContributingFactor = z.infer<typeof ContributingFactorSchema>;

// Recommended action schema
export const RecommendedActionSchema = z.object({
  action_id: z.string().min(1),
  action_type: z.enum(['immediate', 'preventive', 'monitoring', 'maintenance']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1),
  estimated_cost: z.number().nonnegative().optional(),
  estimated_duration_hours: z.number().positive().optional(),
  required_personnel: z.array(z.string()).default([]),
  equipment_needed: z.array(z.string()).default([]),
  safety_requirements: z.array(z.string()).default([]),
  expected_risk_reduction: z.number().min(0).max(1).optional() // Percentage as decimal
});

export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

// Risk assessment validation schema
export const RiskAssessmentSchema = z.object({
  assessment_id: z.string().min(1),
  timestamp: z.date(),
  spatial_extent: PolygonSchema,
  centroid: SpatialLocationSchema.optional(),
  risk_probability: z.number().min(0).max(1),
  confidence_interval: ConfidenceIntervalSchema,
  risk_level: RiskLevelSchema,
  time_to_failure_hours: z.number().positive().optional(),
  time_to_failure_confidence: ConfidenceIntervalSchema.optional(),
  contributing_factors: z.array(ContributingFactorSchema),
  recommended_actions: z.array(RecommendedActionSchema),
  explanation: z.string().min(1),
  model_version: z.string().optional(),
  data_sources: z.array(z.string()).default([]),
  affected_infrastructure: z.array(z.string()).default([]),
  potential_consequences: z.array(z.string()).default([]),
  historical_precedents: z.array(z.string()).default([]),
  weather_conditions: z.record(z.string(), z.any()).optional(),
  geological_conditions: z.record(z.string(), z.any()).optional(),
  created_by: z.string().optional(),
  reviewed_by: z.string().optional(),
  review_status: z.enum(['pending', 'approved', 'rejected', 'needs_revision']).default('pending'),
  expires_at: z.date().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type RiskAssessmentData = z.infer<typeof RiskAssessmentSchema>;

// Input type for constructor
export type RiskAssessmentInput = Omit<RiskAssessmentData, 'centroid' | 'data_sources' | 'affected_infrastructure' | 'potential_consequences' | 'historical_precedents' | 'review_status'> & {
  centroid?: SpatialLocationInput;
  data_sources?: string[];
  affected_infrastructure?: string[];
  potential_consequences?: string[];
  historical_precedents?: string[];
  review_status?: 'pending' | 'approved' | 'rejected' | 'needs_revision';
};

export class RiskAssessment {
  public readonly assessment_id: string;
  public readonly timestamp: Date;
  public readonly spatial_extent: Polygon;
  public readonly centroid?: SpatialLocation;
  public readonly risk_probability: number;
  public readonly confidence_interval: ConfidenceInterval;
  public readonly risk_level: RiskLevel;
  public readonly time_to_failure_hours?: number;
  public readonly time_to_failure_confidence?: ConfidenceInterval;
  public readonly contributing_factors: ContributingFactor[];
  public readonly recommended_actions: RecommendedAction[];
  public readonly explanation: string;
  public readonly model_version?: string;
  public readonly data_sources: string[];
  public readonly affected_infrastructure: string[];
  public readonly potential_consequences: string[];
  public readonly historical_precedents: string[];
  public readonly weather_conditions?: Record<string, any>;
  public readonly geological_conditions?: Record<string, any>;
  public readonly created_by?: string;
  public readonly reviewed_by?: string;
  public readonly review_status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  public readonly expires_at?: Date;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  constructor(data: RiskAssessmentInput) {
    const validated = RiskAssessmentSchema.parse({
      ...data,
      centroid: data.centroid,
      created_at: data.created_at || new Date(),
      updated_at: data.updated_at || new Date()
    });
    
    this.assessment_id = validated.assessment_id;
    this.timestamp = validated.timestamp;
    this.spatial_extent = validated.spatial_extent;
    this.centroid = validated.centroid ? new SpatialLocation(validated.centroid) : undefined;
    this.risk_probability = validated.risk_probability;
    this.confidence_interval = validated.confidence_interval;
    this.risk_level = validated.risk_level;
    this.time_to_failure_hours = validated.time_to_failure_hours;
    this.time_to_failure_confidence = validated.time_to_failure_confidence;
    this.contributing_factors = validated.contributing_factors;
    this.recommended_actions = validated.recommended_actions;
    this.explanation = validated.explanation;
    this.model_version = validated.model_version;
    this.data_sources = validated.data_sources;
    this.affected_infrastructure = validated.affected_infrastructure;
    this.potential_consequences = validated.potential_consequences;
    this.historical_precedents = validated.historical_precedents;
    this.weather_conditions = validated.weather_conditions;
    this.geological_conditions = validated.geological_conditions;
    this.created_by = validated.created_by;
    this.reviewed_by = validated.reviewed_by;
    this.review_status = validated.review_status;
    this.expires_at = validated.expires_at;
    this.created_at = validated.created_at;
    this.updated_at = validated.updated_at;
  }

  /**
   * Check if the risk assessment is still valid (not expired)
   */
  public isValid(): boolean {
    if (!this.expires_at) return true;
    return new Date() < this.expires_at;
  }

  /**
   * Check if the risk assessment is critical
   */
  public isCritical(): boolean {
    return this.risk_level === 'critical' || this.risk_probability >= 0.8;
  }

  /**
   * Check if immediate action is required
   */
  public requiresImmediateAction(): boolean {
    return this.isCritical() || 
           this.recommended_actions.some(action => action.action_type === 'immediate');
  }

  /**
   * Get the most critical recommended action
   */
  public getMostCriticalAction(): RecommendedAction | undefined {
    const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
    
    return this.recommended_actions
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])[0];
  }

  /**
   * Get actions by type
   */
  public getActionsByType(actionType: 'immediate' | 'preventive' | 'monitoring' | 'maintenance'): RecommendedAction[] {
    return this.recommended_actions.filter(action => action.action_type === actionType);
  }

  /**
   * Calculate total estimated cost of all recommended actions
   */
  public getTotalEstimatedCost(): number {
    return this.recommended_actions.reduce((total, action) => {
      return total + (action.estimated_cost || 0);
    }, 0);
  }

  /**
   * Calculate expected risk reduction from all actions
   */
  public getExpectedRiskReduction(): number {
    // Use maximum risk reduction (not additive) as actions may overlap
    return Math.max(...this.recommended_actions.map(action => action.expected_risk_reduction || 0));
  }

  /**
   * Get the most important contributing factors
   */
  public getTopContributingFactors(limit: number = 5): ContributingFactor[] {
    return this.contributing_factors
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * Check if specific infrastructure is affected
   */
  public isInfrastructureAffected(infrastructure: string): boolean {
    return this.affected_infrastructure.includes(infrastructure);
  }

  /**
   * Get risk assessment age in hours
   */
  public getAgeHours(): number {
    return (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Check if assessment is stale (older than threshold)
   */
  public isStale(thresholdHours: number = 24): boolean {
    return this.getAgeHours() > thresholdHours;
  }

  /**
   * Generate risk score (0-100)
   */
  public getRiskScore(): number {
    let score = this.risk_probability * 100;
    
    // Adjust for time to failure
    if (this.time_to_failure_hours) {
      if (this.time_to_failure_hours < 24) score += 20;
      else if (this.time_to_failure_hours < 72) score += 10;
    }
    
    // Adjust for contributing factors
    const criticalFactors = this.contributing_factors.filter(f => f.threshold_exceeded).length;
    score += criticalFactors * 5;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Validate risk assessment data
   */
  public static validate(data: unknown): RiskAssessmentData {
    return RiskAssessmentSchema.parse(data);
  }

  /**
   * Create risk assessment summary for dashboard
   */
  public getSummary(): {
    assessment_id: string;
    risk_level: RiskLevel;
    risk_probability: number;
    risk_score: number;
    time_to_failure_hours?: number;
    requires_immediate_action: boolean;
    top_factors: string[];
    critical_actions: number;
    total_cost: number;
    age_hours: number;
    is_valid: boolean;
  } {
    return {
      assessment_id: this.assessment_id,
      risk_level: this.risk_level,
      risk_probability: this.risk_probability,
      risk_score: this.getRiskScore(),
      time_to_failure_hours: this.time_to_failure_hours,
      requires_immediate_action: this.requiresImmediateAction(),
      top_factors: this.getTopContributingFactors(3).map(f => f.factor_name),
      critical_actions: this.recommended_actions.filter(a => a.priority === 'critical').length,
      total_cost: this.getTotalEstimatedCost(),
      age_hours: this.getAgeHours(),
      is_valid: this.isValid()
    };
  }

  /**
   * Convert to GeoJSON Feature
   */
  public toGeoJSON(): {
    type: 'Feature';
    geometry: Polygon;
    properties: Record<string, any>;
  } {
    return {
      type: 'Feature',
      geometry: this.spatial_extent,
      properties: {
        assessment_id: this.assessment_id,
        risk_level: this.risk_level,
        risk_probability: this.risk_probability,
        risk_score: this.getRiskScore(),
        time_to_failure_hours: this.time_to_failure_hours,
        explanation: this.explanation,
        contributing_factors: this.contributing_factors.length,
        recommended_actions: this.recommended_actions.length,
        requires_immediate_action: this.requiresImmediateAction(),
        centroid: this.centroid?.toGeoJSON(),
        timestamp: this.timestamp.toISOString(),
        expires_at: this.expires_at?.toISOString(),
        review_status: this.review_status
      }
    };
  }

  /**
   * Serialize to JSON
   */
  public toJSON(): RiskAssessmentData {
    return {
      assessment_id: this.assessment_id,
      timestamp: this.timestamp,
      spatial_extent: this.spatial_extent,
      centroid: this.centroid?.toJSON(),
      risk_probability: this.risk_probability,
      confidence_interval: this.confidence_interval,
      risk_level: this.risk_level,
      time_to_failure_hours: this.time_to_failure_hours,
      time_to_failure_confidence: this.time_to_failure_confidence,
      contributing_factors: this.contributing_factors,
      recommended_actions: this.recommended_actions,
      explanation: this.explanation,
      model_version: this.model_version,
      data_sources: this.data_sources,
      affected_infrastructure: this.affected_infrastructure,
      potential_consequences: this.potential_consequences,
      historical_precedents: this.historical_precedents,
      weather_conditions: this.weather_conditions,
      geological_conditions: this.geological_conditions,
      created_by: this.created_by,
      reviewed_by: this.reviewed_by,
      review_status: this.review_status,
      expires_at: this.expires_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Create from JSON
   */
  public static fromJSON(json: any): RiskAssessment {
    return new RiskAssessment({
      ...json,
      timestamp: new Date(json.timestamp),
      expires_at: json.expires_at ? new Date(json.expires_at) : undefined,
      created_at: json.created_at ? new Date(json.created_at) : undefined,
      updated_at: json.updated_at ? new Date(json.updated_at) : undefined
    });
  }
}