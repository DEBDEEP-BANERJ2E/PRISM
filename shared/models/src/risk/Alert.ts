import { z } from 'zod';
import { SpatialLocation, SpatialLocationSchema } from '../spatial';
import type { SpatialLocationInput } from '../spatial/SpatialLocation';
import { RiskLevelSchema, type RiskLevel } from './RiskAssessment';

// Alert type enumeration
export const AlertTypeSchema = z.enum([
  'rockfall_risk', 'sensor_failure', 'communication_loss', 'battery_low',
  'calibration_due', 'maintenance_required', 'weather_warning', 'system_error'
]);

export type AlertType = z.infer<typeof AlertTypeSchema>;

// Alert severity enumeration
export const AlertSeveritySchema = z.enum(['info', 'warning', 'critical', 'emergency']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

// Alert status enumeration
export const AlertStatusSchema = z.enum(['active', 'acknowledged', 'resolved', 'suppressed']);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

// Notification channel enumeration
export const NotificationChannelSchema = z.enum(['sms', 'email', 'push', 'webhook', 'radio']);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

// Alert escalation rule schema
export const EscalationRuleSchema = z.object({
  level: z.number().int().positive(),
  delay_minutes: z.number().int().nonnegative(),
  recipients: z.array(z.string()),
  channels: z.array(NotificationChannelSchema),
  conditions: z.array(z.string()).default([])
});

export type EscalationRule = z.infer<typeof EscalationRuleSchema>;

// Alert notification schema
export const AlertNotificationSchema = z.object({
  notification_id: z.string().min(1),
  channel: NotificationChannelSchema,
  recipient: z.string().min(1),
  sent_at: z.date(),
  delivered_at: z.date().optional(),
  acknowledged_at: z.date().optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'acknowledged']),
  error_message: z.string().optional(),
  retry_count: z.number().int().nonnegative().default(0)
});

export type AlertNotification = z.infer<typeof AlertNotificationSchema>;

// Alert validation schema
export const AlertSchema = z.object({
  alert_id: z.string().min(1),
  alert_type: AlertTypeSchema,
  severity: AlertSeveritySchema,
  status: AlertStatusSchema.default('active'),
  title: z.string().min(1),
  message: z.string().min(1),
  location: SpatialLocationSchema.optional(),
  risk_level: RiskLevelSchema.optional(),
  source_id: z.string().optional(), // ID of the source (sensor, assessment, etc.)
  source_type: z.string().optional(), // Type of source
  triggered_at: z.date(),
  acknowledged_at: z.date().optional(),
  acknowledged_by: z.string().optional(),
  resolved_at: z.date().optional(),
  resolved_by: z.string().optional(),
  suppressed_until: z.date().optional(),
  escalation_rules: z.array(EscalationRuleSchema).default([]),
  notifications: z.array(AlertNotificationSchema).default([]),
  related_alerts: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
  tags: z.array(z.string()).default([]),
  priority_score: z.number().min(0).max(100).optional(),
  auto_resolve: z.boolean().default(false),
  auto_resolve_after_minutes: z.number().int().positive().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type AlertData = z.infer<typeof AlertSchema>;

// Input type for constructor
export type AlertInput = Omit<AlertData, 'location' | 'status' | 'escalation_rules' | 'notifications' | 'related_alerts' | 'metadata' | 'tags' | 'auto_resolve'> & {
  location?: SpatialLocationInput;
  status?: AlertStatus;
  escalation_rules?: EscalationRule[];
  notifications?: AlertNotification[];
  related_alerts?: string[];
  metadata?: Record<string, any>;
  tags?: string[];
  auto_resolve?: boolean;
};

export class Alert {
  public readonly alert_id: string;
  public readonly alert_type: AlertType;
  public readonly severity: AlertSeverity;
  public readonly status: AlertStatus;
  public readonly title: string;
  public readonly message: string;
  public readonly location?: SpatialLocation;
  public readonly risk_level?: RiskLevel;
  public readonly source_id?: string;
  public readonly source_type?: string;
  public readonly triggered_at: Date;
  public readonly acknowledged_at?: Date;
  public readonly acknowledged_by?: string;
  public readonly resolved_at?: Date;
  public readonly resolved_by?: string;
  public readonly suppressed_until?: Date;
  public readonly escalation_rules: EscalationRule[];
  public readonly notifications: AlertNotification[];
  public readonly related_alerts: string[];
  public readonly metadata: Record<string, any>;
  public readonly tags: string[];
  public readonly priority_score?: number;
  public readonly auto_resolve: boolean;
  public readonly auto_resolve_after_minutes?: number;
  public readonly created_at?: Date;
  public readonly updated_at?: Date;

  constructor(data: AlertInput) {
    const validated = AlertSchema.parse({
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
    this.location = validated.location ? new SpatialLocation(validated.location) : undefined;
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

  /**
   * Check if the alert is currently active
   */
  public isActive(): boolean {
    return this.status === 'active' && !this.isSuppressed();
  }

  /**
   * Check if the alert is acknowledged
   */
  public isAcknowledged(): boolean {
    return this.status === 'acknowledged' || this.acknowledged_at !== undefined;
  }

  /**
   * Check if the alert is resolved
   */
  public isResolved(): boolean {
    return this.status === 'resolved' || this.resolved_at !== undefined;
  }

  /**
   * Check if the alert is currently suppressed
   */
  public isSuppressed(): boolean {
    if (!this.suppressed_until) return false;
    return new Date() < this.suppressed_until;
  }

  /**
   * Check if the alert is critical
   */
  public isCritical(): boolean {
    return this.severity === 'critical' || this.severity === 'emergency';
  }

  /**
   * Get alert age in minutes
   */
  public getAgeMinutes(): number {
    return (Date.now() - this.triggered_at.getTime()) / (1000 * 60);
  }

  /**
   * Get time since acknowledgment in minutes
   */
  public getTimeSinceAcknowledgmentMinutes(): number | undefined {
    if (!this.acknowledged_at) return undefined;
    return (Date.now() - this.acknowledged_at.getTime()) / (1000 * 60);
  }

  /**
   * Get time to resolution in minutes
   */
  public getTimeToResolutionMinutes(): number | undefined {
    if (!this.resolved_at) return undefined;
    return (this.resolved_at.getTime() - this.triggered_at.getTime()) / (1000 * 60);
  }

  /**
   * Check if alert should be auto-resolved
   */
  public shouldAutoResolve(): boolean {
    if (!this.auto_resolve || !this.auto_resolve_after_minutes) return false;
    return this.getAgeMinutes() >= this.auto_resolve_after_minutes;
  }

  /**
   * Get next escalation level that should be triggered
   */
  public getNextEscalationLevel(): EscalationRule | undefined {
    const ageMinutes = this.getAgeMinutes();
    
    return this.escalation_rules
      .filter(rule => ageMinutes >= rule.delay_minutes)
      .find(rule => {
        // Check if this escalation level has already been triggered
        const levelNotifications = this.notifications.filter(n => 
          rule.recipients.includes(n.recipient) && 
          rule.channels.includes(n.channel)
        );
        return levelNotifications.length === 0;
      });
  }

  /**
   * Get failed notifications that need retry
   */
  public getFailedNotifications(): AlertNotification[] {
    return this.notifications.filter(n => n.status === 'failed' && n.retry_count < 3);
  }

  /**
   * Get successful notification rate
   */
  public getNotificationSuccessRate(): number {
    if (this.notifications.length === 0) return 1;
    
    const successful = this.notifications.filter(n => 
      n.status === 'delivered' || n.status === 'acknowledged'
    ).length;
    
    return successful / this.notifications.length;
  }

  /**
   * Calculate priority score if not provided
   */
  public calculatePriorityScore(): number {
    if (this.priority_score !== undefined) return this.priority_score;
    
    let score = 0;
    
    // Base score by severity
    const severityScores = { 'info': 10, 'warning': 30, 'critical': 70, 'emergency': 100 };
    score += severityScores[this.severity];
    
    // Adjust by risk level
    if (this.risk_level) {
      const riskScores = { 'very_low': 0, 'low': 5, 'medium': 15, 'high': 25, 'critical': 35 };
      score += riskScores[this.risk_level];
    }
    
    // Adjust by age (older alerts get higher priority)
    const ageMinutes = this.getAgeMinutes();
    if (ageMinutes > 60) score += 10; // Over 1 hour
    if (ageMinutes > 240) score += 10; // Over 4 hours
    
    // Adjust by acknowledgment status
    if (!this.isAcknowledged()) score += 20;
    
    return Math.min(100, score);
  }

  /**
   * Check if alert matches given tags
   */
  public hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  /**
   * Check if alert matches any of the given tags
   */
  public hasAnyTag(tags: string[]): boolean {
    return tags.some(tag => this.hasTag(tag));
  }

  /**
   * Get alert summary for dashboard
   */
  public getSummary(): {
    alert_id: string;
    alert_type: AlertType;
    severity: AlertSeverity;
    status: AlertStatus;
    title: string;
    age_minutes: number;
    priority_score: number;
    is_acknowledged: boolean;
    is_suppressed: boolean;
    notification_success_rate: number;
    location?: { latitude: number; longitude: number };
  } {
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

  /**
   * Validate alert data
   */
  public static validate(data: unknown): AlertData {
    return AlertSchema.parse(data);
  }

  /**
   * Create alert for risk assessment
   */
  public static createRiskAlert(
    riskAssessment: { assessment_id: string; risk_level: RiskLevel; risk_probability: number; explanation: string },
    location?: SpatialLocationInput
  ): Alert {
    const severity: AlertSeverity = 
      riskAssessment.risk_level === 'critical' ? 'emergency' :
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

  /**
   * Create alert for sensor failure
   */
  public static createSensorAlert(
    sensorId: string,
    alertType: 'sensor_failure' | 'battery_low' | 'communication_loss' | 'calibration_due',
    message: string,
    location?: SpatialLocationInput
  ): Alert {
    const severityMap = {
      'sensor_failure': 'critical' as AlertSeverity,
      'battery_low': 'warning' as AlertSeverity,
      'communication_loss': 'warning' as AlertSeverity,
      'calibration_due': 'info' as AlertSeverity
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

  /**
   * Serialize to JSON
   */
  public toJSON(): AlertData {
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

  /**
   * Create from JSON
   */
  public static fromJSON(json: any): Alert {
    return new Alert({
      ...json,
      triggered_at: new Date(json.triggered_at),
      acknowledged_at: json.acknowledged_at ? new Date(json.acknowledged_at) : undefined,
      resolved_at: json.resolved_at ? new Date(json.resolved_at) : undefined,
      suppressed_until: json.suppressed_until ? new Date(json.suppressed_until) : undefined,
      created_at: json.created_at ? new Date(json.created_at) : undefined,
      updated_at: json.updated_at ? new Date(json.updated_at) : undefined,
      notifications: json.notifications?.map((n: any) => ({
        ...n,
        sent_at: new Date(n.sent_at),
        delivered_at: n.delivered_at ? new Date(n.delivered_at) : undefined,
        acknowledged_at: n.acknowledged_at ? new Date(n.acknowledged_at) : undefined
      })) || []
    });
  }
}