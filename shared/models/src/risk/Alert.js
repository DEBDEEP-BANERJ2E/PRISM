"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alert = exports.AlertSchema = exports.AlertNotificationSchema = exports.EscalationRuleSchema = exports.NotificationChannelSchema = exports.AlertStatusSchema = exports.AlertSeveritySchema = exports.AlertTypeSchema = void 0;
const zod_1 = require("zod");
const spatial_1 = require("../spatial");
const RiskAssessment_1 = require("./RiskAssessment");
exports.AlertTypeSchema = zod_1.z.enum([
    'rockfall_risk', 'sensor_failure', 'communication_loss', 'battery_low',
    'calibration_due', 'maintenance_required', 'weather_warning', 'system_error'
]);
exports.AlertSeveritySchema = zod_1.z.enum(['info', 'warning', 'critical', 'emergency']);
exports.AlertStatusSchema = zod_1.z.enum(['active', 'acknowledged', 'resolved', 'suppressed']);
exports.NotificationChannelSchema = zod_1.z.enum(['sms', 'email', 'push', 'webhook', 'radio']);
exports.EscalationRuleSchema = zod_1.z.object({
    level: zod_1.z.number().int().positive(),
    delay_minutes: zod_1.z.number().int().nonnegative(),
    recipients: zod_1.z.array(zod_1.z.string()),
    channels: zod_1.z.array(exports.NotificationChannelSchema),
    conditions: zod_1.z.array(zod_1.z.string()).default([])
});
exports.AlertNotificationSchema = zod_1.z.object({
    notification_id: zod_1.z.string().min(1),
    channel: exports.NotificationChannelSchema,
    recipient: zod_1.z.string().min(1),
    sent_at: zod_1.z.date(),
    delivered_at: zod_1.z.date().optional(),
    acknowledged_at: zod_1.z.date().optional(),
    status: zod_1.z.enum(['pending', 'sent', 'delivered', 'failed', 'acknowledged']),
    error_message: zod_1.z.string().optional(),
    retry_count: zod_1.z.number().int().nonnegative().default(0)
});
exports.AlertSchema = zod_1.z.object({
    alert_id: zod_1.z.string().min(1),
    alert_type: exports.AlertTypeSchema,
    severity: exports.AlertSeveritySchema,
    status: exports.AlertStatusSchema.default('active'),
    title: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
    location: spatial_1.SpatialLocationSchema.optional(),
    risk_level: RiskAssessment_1.RiskLevelSchema.optional(),
    source_id: zod_1.z.string().optional(),
    source_type: zod_1.z.string().optional(),
    triggered_at: zod_1.z.date(),
    acknowledged_at: zod_1.z.date().optional(),
    acknowledged_by: zod_1.z.string().optional(),
    resolved_at: zod_1.z.date().optional(),
    resolved_by: zod_1.z.string().optional(),
    suppressed_until: zod_1.z.date().optional(),
    escalation_rules: zod_1.z.array(exports.EscalationRuleSchema).default([]),
    notifications: zod_1.z.array(exports.AlertNotificationSchema).default([]),
    related_alerts: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    priority_score: zod_1.z.number().min(0).max(100).optional(),
    auto_resolve: zod_1.z.boolean().default(false),
    auto_resolve_after_minutes: zod_1.z.number().int().positive().optional(),
    created_at: zod_1.z.date().optional(),
    updated_at: zod_1.z.date().optional()
});
class Alert {
    constructor(data) {
        const validated = exports.AlertSchema.parse({
            ...data,
            location: data.location,
            created_at: data.created_at || new Date(),
            updated_at: data.updated_at || new Date()
        });
        this.alert_id = validated.alert_id;
        this.alert_type = validated.alert_type;
        this.severity = validated.severity;
        this.status = validated.status;
        this.title = validated.title;
        this.message = validated.message;
        this.location = validated.location ? new spatial_1.SpatialLocation(validated.location) : undefined;
        this.risk_level = validated.risk_level;
        this.source_id = validated.source_id;
        this.source_type = validated.source_type;
        this.triggered_at = validated.triggered_at;
        this.acknowledged_at = validated.acknowledged_at;
        this.acknowledged_by = validated.acknowledged_by;
        this.resolved_at = validated.resolved_at;
        this.resolved_by = validated.resolved_by;
        this.suppressed_until = validated.suppressed_until;
        this.escalation_rules = validated.escalation_rules;
        this.notifications = validated.notifications;
        this.related_alerts = validated.related_alerts;
        this.metadata = validated.metadata;
        this.tags = validated.tags;
        this.priority_score = validated.priority_score;
        this.auto_resolve = validated.auto_resolve;
        this.auto_resolve_after_minutes = validated.auto_resolve_after_minutes;
        this.created_at = validated.created_at;
        this.updated_at = validated.updated_at;
    }
    isActive() {
        return this.status === 'active' && !this.isSuppressed();
    }
    isAcknowledged() {
        return this.status === 'acknowledged' || this.acknowledged_at !== undefined;
    }
    isResolved() {
        return this.status === 'resolved' || this.resolved_at !== undefined;
    }
    isSuppressed() {
        if (!this.suppressed_until)
            return false;
        return new Date() < this.suppressed_until;
    }
    isCritical() {
        return this.severity === 'critical' || this.severity === 'emergency';
    }
    getAgeMinutes() {
        return (Date.now() - this.triggered_at.getTime()) / (1000 * 60);
    }
    getTimeSinceAcknowledgmentMinutes() {
        if (!this.acknowledged_at)
            return undefined;
        return (Date.now() - this.acknowledged_at.getTime()) / (1000 * 60);
    }
    getTimeToResolutionMinutes() {
        if (!this.resolved_at)
            return undefined;
        return (this.resolved_at.getTime() - this.triggered_at.getTime()) / (1000 * 60);
    }
    shouldAutoResolve() {
        if (!this.auto_resolve || !this.auto_resolve_after_minutes)
            return false;
        return this.getAgeMinutes() >= this.auto_resolve_after_minutes;
    }
    getNextEscalationLevel() {
        const ageMinutes = this.getAgeMinutes();
        return this.escalation_rules
            .filter(rule => ageMinutes >= rule.delay_minutes)
            .find(rule => {
            const levelNotifications = this.notifications.filter(n => rule.recipients.includes(n.recipient) &&
                rule.channels.includes(n.channel));
            return levelNotifications.length === 0;
        });
    }
    getFailedNotifications() {
        return this.notifications.filter(n => n.status === 'failed' && n.retry_count < 3);
    }
    getNotificationSuccessRate() {
        if (this.notifications.length === 0)
            return 1;
        const successful = this.notifications.filter(n => n.status === 'delivered' || n.status === 'acknowledged').length;
        return successful / this.notifications.length;
    }
    calculatePriorityScore() {
        if (this.priority_score !== undefined)
            return this.priority_score;
        let score = 0;
        const severityScores = { 'info': 10, 'warning': 30, 'critical': 70, 'emergency': 100 };
        score += severityScores[this.severity];
        if (this.risk_level) {
            const riskScores = { 'very_low': 0, 'low': 5, 'medium': 15, 'high': 25, 'critical': 35 };
            score += riskScores[this.risk_level];
        }
        const ageMinutes = this.getAgeMinutes();
        if (ageMinutes > 60)
            score += 10;
        if (ageMinutes > 240)
            score += 10;
        if (!this.isAcknowledged())
            score += 20;
        return Math.min(100, score);
    }
    hasTag(tag) {
        return this.tags.includes(tag);
    }
    hasAnyTag(tags) {
        return tags.some(tag => this.hasTag(tag));
    }
    getSummary() {
        return {
            alert_id: this.alert_id,
            alert_type: this.alert_type,
            severity: this.severity,
            status: this.status,
            title: this.title,
            age_minutes: this.getAgeMinutes(),
            priority_score: this.calculatePriorityScore(),
            is_acknowledged: this.isAcknowledged(),
            is_suppressed: this.isSuppressed(),
            notification_success_rate: this.getNotificationSuccessRate(),
            location: this.location ? {
                latitude: this.location.latitude,
                longitude: this.location.longitude
            } : undefined
        };
    }
    static validate(data) {
        return exports.AlertSchema.parse(data);
    }
    static createRiskAlert(riskAssessment, location) {
        const severity = riskAssessment.risk_level === 'critical' ? 'emergency' :
            riskAssessment.risk_level === 'high' ? 'critical' :
                riskAssessment.risk_level === 'medium' ? 'warning' : 'info';
        return new Alert({
            alert_id: `risk_${riskAssessment.assessment_id}_${Date.now()}`,
            alert_type: 'rockfall_risk',
            severity,
            title: `${riskAssessment.risk_level.toUpperCase()} Rockfall Risk Detected`,
            message: `Risk probability: ${(riskAssessment.risk_probability * 100).toFixed(1)}%. ${riskAssessment.explanation}`,
            location,
            risk_level: riskAssessment.risk_level,
            source_id: riskAssessment.assessment_id,
            source_type: 'risk_assessment',
            triggered_at: new Date(),
            metadata: {
                risk_probability: riskAssessment.risk_probability
            },
            tags: ['rockfall', 'risk', riskAssessment.risk_level]
        });
    }
    static createSensorAlert(sensorId, alertType, message, location) {
        const severityMap = {
            'sensor_failure': 'critical',
            'battery_low': 'warning',
            'communication_loss': 'warning',
            'calibration_due': 'info'
        };
        return new Alert({
            alert_id: `sensor_${sensorId}_${alertType}_${Date.now()}`,
            alert_type: alertType,
            severity: severityMap[alertType],
            title: `Sensor ${alertType.replace('_', ' ').toUpperCase()}`,
            message,
            location,
            source_id: sensorId,
            source_type: 'sensor',
            triggered_at: new Date(),
            tags: ['sensor', alertType, sensorId]
        });
    }
    toJSON() {
        return {
            alert_id: this.alert_id,
            alert_type: this.alert_type,
            severity: this.severity,
            status: this.status,
            title: this.title,
            message: this.message,
            location: this.location?.toJSON(),
            risk_level: this.risk_level,
            source_id: this.source_id,
            source_type: this.source_type,
            triggered_at: this.triggered_at,
            acknowledged_at: this.acknowledged_at,
            acknowledged_by: this.acknowledged_by,
            resolved_at: this.resolved_at,
            resolved_by: this.resolved_by,
            suppressed_until: this.suppressed_until,
            escalation_rules: this.escalation_rules,
            notifications: this.notifications,
            related_alerts: this.related_alerts,
            metadata: this.metadata,
            tags: this.tags,
            priority_score: this.priority_score,
            auto_resolve: this.auto_resolve,
            auto_resolve_after_minutes: this.auto_resolve_after_minutes,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
    static fromJSON(json) {
        return new Alert({
            ...json,
            triggered_at: new Date(json.triggered_at),
            acknowledged_at: json.acknowledged_at ? new Date(json.acknowledged_at) : undefined,
            resolved_at: json.resolved_at ? new Date(json.resolved_at) : undefined,
            suppressed_until: json.suppressed_until ? new Date(json.suppressed_until) : undefined,
            created_at: json.created_at ? new Date(json.created_at) : undefined,
            updated_at: json.updated_at ? new Date(json.updated_at) : undefined,
            notifications: json.notifications?.map((n) => ({
                ...n,
                sent_at: new Date(n.sent_at),
                delivered_at: n.delivered_at ? new Date(n.delivered_at) : undefined,
                acknowledged_at: n.acknowledged_at ? new Date(n.acknowledged_at) : undefined
            })) || []
        });
    }
}
exports.Alert = Alert;
//# sourceMappingURL=Alert.js.map