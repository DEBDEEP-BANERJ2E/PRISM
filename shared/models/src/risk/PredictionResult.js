"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionResult = exports.PredictionResultSchema = exports.ModelPerformanceSchema = exports.FeatureImportanceSchema = exports.ModelTypeSchema = exports.PredictionTypeSchema = void 0;
const zod_1 = require("zod");
const spatial_1 = require("../spatial");
const RiskAssessment_1 = require("./RiskAssessment");
exports.PredictionTypeSchema = zod_1.z.enum([
    'displacement', 'failure_probability', 'time_to_failure', 'stability_factor',
    'stress_distribution', 'deformation_rate', 'groundwater_level', 'temperature_trend'
]);
exports.ModelTypeSchema = zod_1.z.enum([
    'statistical', 'machine_learning', 'physics_based', 'hybrid', 'ensemble'
]);
exports.FeatureImportanceSchema = zod_1.z.object({
    feature_name: zod_1.z.string().min(1),
    importance_score: zod_1.z.number().min(0).max(1),
    feature_value: zod_1.z.number().optional(),
    feature_unit: zod_1.z.string().optional(),
    contribution_direction: zod_1.z.enum(['positive', 'negative', 'neutral']).optional()
});
exports.ModelPerformanceSchema = zod_1.z.object({
    accuracy: zod_1.z.number().min(0).max(1).optional(),
    precision: zod_1.z.number().min(0).max(1).optional(),
    recall: zod_1.z.number().min(0).max(1).optional(),
    f1_score: zod_1.z.number().min(0).max(1).optional(),
    auc_roc: zod_1.z.number().min(0).max(1).optional(),
    rmse: zod_1.z.number().nonnegative().optional(),
    mae: zod_1.z.number().nonnegative().optional(),
    r_squared: zod_1.z.number().min(-1).max(1).optional(),
    cross_validation_score: zod_1.z.number().min(0).max(1).optional(),
    training_samples: zod_1.z.number().int().positive().optional(),
    validation_samples: zod_1.z.number().int().positive().optional()
});
exports.PredictionResultSchema = zod_1.z.object({
    prediction_id: zod_1.z.string().min(1),
    timestamp: zod_1.z.date(),
    location: spatial_1.SpatialLocationSchema.optional(),
    prediction_type: exports.PredictionTypeSchema,
    predicted_value: zod_1.z.number(),
    predicted_unit: zod_1.z.string(),
    confidence_interval: RiskAssessment_1.ConfidenceIntervalSchema,
    prediction_horizon_hours: zod_1.z.number().positive(),
    model_type: exports.ModelTypeSchema,
    model_name: zod_1.z.string().min(1),
    model_version: zod_1.z.string().optional(),
    feature_importance: zod_1.z.array(exports.FeatureImportanceSchema).default([]),
    model_performance: exports.ModelPerformanceSchema.optional(),
    input_features: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    preprocessing_steps: zod_1.z.array(zod_1.z.string()).default([]),
    uncertainty_sources: zod_1.z.array(zod_1.z.string()).default([]),
    validation_status: zod_1.z.enum(['validated', 'pending', 'failed', 'outdated']).default('pending'),
    actual_value: zod_1.z.number().optional(),
    actual_timestamp: zod_1.z.date().optional(),
    prediction_error: zod_1.z.number().optional(),
    explanation: zod_1.z.string().optional(),
    related_predictions: zod_1.z.array(zod_1.z.string()).default([]),
    data_quality_score: zod_1.z.number().min(0).max(1).optional(),
    computational_time_ms: zod_1.z.number().nonnegative().optional(),
    created_at: zod_1.z.date().optional(),
    updated_at: zod_1.z.date().optional()
});
class PredictionResult {
    constructor(data) {
        const validated = exports.PredictionResultSchema.parse({
            ...data,
            location: data.location,
            created_at: data.created_at || new Date(),
            updated_at: data.updated_at || new Date()
        });
        this.prediction_id = validated.prediction_id;
        this.timestamp = validated.timestamp;
        this.location = validated.location ? new spatial_1.SpatialLocation(validated.location) : undefined;
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
    isValid() {
        const hoursElapsed = (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
        return hoursElapsed <= this.prediction_horizon_hours;
    }
    isValidated() {
        return this.validation_status === 'validated' &&
            this.actual_value !== undefined &&
            this.actual_timestamp !== undefined;
    }
    getAccuracy() {
        if (!this.isValidated() || this.actual_value === undefined)
            return undefined;
        const error = Math.abs(this.predicted_value - this.actual_value);
        const range = Math.abs(this.actual_value) || 1;
        return Math.max(0, 1 - (error / range));
    }
    getAbsoluteError() {
        if (!this.isValidated() || this.actual_value === undefined)
            return undefined;
        return Math.abs(this.predicted_value - this.actual_value);
    }
    getRelativeError() {
        if (!this.isValidated() || this.actual_value === undefined)
            return undefined;
        if (this.actual_value === 0)
            return undefined;
        return Math.abs(this.predicted_value - this.actual_value) / Math.abs(this.actual_value);
    }
    isWithinConfidenceInterval() {
        if (!this.isValidated() || this.actual_value === undefined)
            return undefined;
        return this.actual_value >= this.confidence_interval.lower &&
            this.actual_value <= this.confidence_interval.upper;
    }
    getConfidenceLevel() {
        return this.confidence_interval.confidence_level * 100;
    }
    getConfidenceWidth() {
        return this.confidence_interval.upper - this.confidence_interval.lower;
    }
    getTopFeatures(limit = 5) {
        return this.feature_importance
            .sort((a, b) => b.importance_score - a.importance_score)
            .slice(0, limit);
    }
    getAgeHours() {
        return (Date.now() - this.timestamp.getTime()) / (1000 * 60 * 60);
    }
    getRemainingValidHours() {
        return Math.max(0, this.prediction_horizon_hours - this.getAgeHours());
    }
    isStale() {
        return !this.isValid();
    }
    getUncertaintyScore() {
        let uncertainty = 0;
        const normalizedWidth = this.getConfidenceWidth() / Math.abs(this.predicted_value || 1);
        uncertainty += Math.min(0.5, normalizedWidth);
        uncertainty += Math.min(0.3, this.uncertainty_sources.length * 0.1);
        if (this.data_quality_score !== undefined) {
            uncertainty += (1 - this.data_quality_score) * 0.2;
        }
        return Math.min(1, uncertainty);
    }
    static validate(data) {
        return exports.PredictionResultSchema.parse(data);
    }
    getSummary() {
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
    toTimeSeriesPoint() {
        return {
            timestamp: this.timestamp,
            value: this.predicted_value,
            confidence_lower: this.confidence_interval.lower,
            confidence_upper: this.confidence_interval.upper,
            model: this.model_name,
            type: this.prediction_type
        };
    }
    toJSON() {
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
    static fromJSON(json) {
        return new PredictionResult({
            ...json,
            timestamp: new Date(json.timestamp),
            actual_timestamp: json.actual_timestamp ? new Date(json.actual_timestamp) : undefined,
            created_at: json.created_at ? new Date(json.created_at) : undefined,
            updated_at: json.updated_at ? new Date(json.updated_at) : undefined
        });
    }
}
exports.PredictionResult = PredictionResult;
//# sourceMappingURL=PredictionResult.js.map