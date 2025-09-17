"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskAssessment = exports.RiskAssessmentSchema = exports.RecommendedActionSchema = exports.ContributingFactorSchema = exports.ConfidenceIntervalSchema = exports.RiskLevelSchema = void 0;
const zod_1 = require("zod");
const spatial_1 = require("../spatial");
exports.RiskLevelSchema = zod_1.z.enum(['very_low', 'low', 'medium', 'high', 'critical']);
exports.ConfidenceIntervalSchema = zod_1.z.object({
    lower: zod_1.z.number().min(0).max(1),
    upper: zod_1.z.number().min(0).max(1),
    confidence_level: zod_1.z.number().min(0).max(1).default(0.95)
}).refine(data => data.lower <= data.upper, {
    message: "Lower bound must be less than or equal to upper bound"
});
exports.ContributingFactorSchema = zod_1.z.object({
    factor_name: zod_1.z.string().min(1),
    importance: zod_1.z.number().min(0).max(1),
    description: zod_1.z.string().optional(),
    measurement_value: zod_1.z.number().optional(),
    measurement_unit: zod_1.z.string().optional(),
    threshold_exceeded: zod_1.z.boolean().default(false)
});
exports.RecommendedActionSchema = zod_1.z.object({
    action_id: zod_1.z.string().min(1),
    action_type: zod_1.z.enum(['immediate', 'preventive', 'monitoring', 'maintenance']),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    description: zod_1.z.string().min(1),
    estimated_cost: zod_1.z.number().nonnegative().optional(),
    estimated_duration_hours: zod_1.z.number().positive().optional(),
    required_personnel: zod_1.z.array(zod_1.z.string()).default([]),
    equipment_needed: zod_1.z.array(zod_1.z.string()).default([]),
    safety_requirements: zod_1.z.array(zod_1.z.string()).default([]),
    expected_risk_reduction: zod_1.z.number().min(0).max(1).optional()
});
exports.RiskAssessmentSchema = zod_1.z.object({
    assessment_id: zod_1.z.string().min(1),
    timestamp: zod_1.z.date(),
    spatial_extent: spatial_1.PolygonSchema,
    centroid: spatial_1.SpatialLocationSchema.optional(),
    risk_probability: zod_1.z.number().min(0).max(1),
    confidence_interval: exports.ConfidenceIntervalSchema,
    risk_level: exports.RiskLevelSchema,
    time_to_failure_hours: zod_1.z.number().positive().optional(),
    time_to_failure_confidence: exports.ConfidenceIntervalSchema.optional(),
    contributing_factors: zod_1.z.array(exports.ContributingFactorSchema),
    recommended_actions: zod_1.z.array(exports.RecommendedActionSchema),
    explanation: zod_1.z.string().min(1),
    model_version: zod_1.z.string().optional(),
    data_sources: zod_1.z.array(zod_1.z.string()).default([]),
    affected_infrastructure: zod_1.z.array(zod_1.z.string()).default([]),
    potential_consequences: zod_1.z.array(zod_1.z.string()).default([]),
    historical_precedents: zod_1.z.array(zod_1.z.string()).default([]),
    weather_conditions: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    geological_conditions: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    created_by: zod_1.z.string().optional(),
    reviewed_by: zod_1.z.string().optional(),
    review_status: zod_1.z.enum(['pending', 'approved', 'rejected', 'needs_revision']).default('pending'),
    expires_at: zod_1.z.date().optional(),
    created_at: zod_1.z.date().optional(),
    updated_at: zod_1.z.date().optional()
});
class RiskAssessment {
    constructor(data) {
        const validated = exports.RiskAssessmentSchema.parse({
            ...data,
            centroid: data.centroid,
            created_at: data.created_at || new Date(),
            updated_at: data.updated_at || new Date()
        });
        this.assessment_id = validated.assessment_id;
        this.timestamp = validated.timestamp;
        this.spatial_extent = validated.spatial_extent;
        this.centroid = validated.centroid ? new spatial_1.SpatialLocation(validated.centroid) : undefined;
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
    isValid() {
        if (!this.expires_at)
            return true;
        return new Date() < this.expires_at;
    }
    isCritical() {
        return this.risk_level === 'critical' || this.risk_probability >= 0.8;
    }
    requiresImmediateAction() {
        return this.isCritical() ||
            this.recommended_actions.some(action => action.action_type === 'immediate');
    }
    getMostCriticalAction() {
        const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return this.recommended_actions
            .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])[0];
    }
    getActionsByType(actionType) {
        return this.recommended_actions.filter(action => action.action_type === actionType);
    }
    getTotalEstimatedCost() {
        return this.recommended_actions.reduce((total, action) => {
            return total + (action.estimated_cost || 0);
        }, 0);
    }
    getExpectedRiskReduction() {
        return Math.max(...this.recommended_actions.map(action => action.expected_risk_reduction || 0));
    }
    getTopContributingFactors(limit = 5) {
        return this.contributing_factors
            .sort((a, b) => b.importance - a.importance)
            .slice(0, limit);
    }
    isInfrastructureAffected(infrastructure) {
        return this.affected_infrastructure.includes(infrastructure);
    }
    getAgeHours() {
        return (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
    }
    isStale(thresholdHours = 24) {
        return this.getAgeHours() > thresholdHours;
    }
    getRiskScore() {
        let score = this.risk_probability * 100;
        if (this.time_to_failure_hours) {
            if (this.time_to_failure_hours < 24)
                score += 20;
            else if (this.time_to_failure_hours < 72)
                score += 10;
        }
        const criticalFactors = this.contributing_factors.filter(f => f.threshold_exceeded).length;
        score += criticalFactors * 5;
        return Math.min(100, Math.max(0, score));
    }
    static validate(data) {
        return exports.RiskAssessmentSchema.parse(data);
    }
    getSummary() {
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
    toGeoJSON() {
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
    toJSON() {
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
    static fromJSON(json) {
        return new RiskAssessment({
            ...json,
            timestamp: new Date(json.timestamp),
            expires_at: json.expires_at ? new Date(json.expires_at) : undefined,
            created_at: json.created_at ? new Date(json.created_at) : undefined,
            updated_at: json.updated_at ? new Date(json.updated_at) : undefined
        });
    }
}
exports.RiskAssessment = RiskAssessment;
//# sourceMappingURL=RiskAssessment.js.map