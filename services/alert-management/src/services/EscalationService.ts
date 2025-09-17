import { Alert, EscalationRule, AlertNotification } from '@prism/shared-models/risk';
import { logger } from '../utils/logger';
import { NotificationService } from './NotificationService';

export interface EscalationConfig {
  maxEscalationLevel: number;
  escalationDelayMinutes: number;
  autoEscalationEnabled: boolean;
  businessHoursOnly: boolean;
  businessHours: {
    start: number; // 0-23
    end: number;   // 0-23
  };
  weekendsEnabled: boolean;
}

export interface EscalationHistory {
  escalation_id: string;
  alert_id: string;
  escalation_level: number;
  escalated_at: Date;
  escalated_to: string[];
  channels_used: string[];
  success: boolean;
  error_message?: string;
}

export class EscalationService {
  private escalationConfig: EscalationConfig;
  private escalationHistory: Map<string, EscalationHistory[]>;

  constructor(private notificationService: NotificationService) {
    this.escalationConfig = {
      maxEscalationLevel: 5,
      escalationDelayMinutes: 15,
      autoEscalationEnabled: true,
      businessHoursOnly: false,
      businessHours: { start: 8, end: 17 },
      weekendsEnabled: true
    };
    this.escalationHistory = new Map();
  }

  /**
   * Process escalation for an alert
   */
  async processEscalation(alert: Alert, escalationRule: EscalationRule): Promise<void> {
    try {
      logger.info(`Processing escalation level ${escalationRule.level} for alert ${alert.alert_id}`);

      // Check if escalation should proceed based on business rules
      if (!this.shouldEscalate(alert, escalationRule)) {
        logger.info(`Escalation skipped for alert ${alert.alert_id} due to business rules`);
        return;
      }

      // Check if this escalation level has already been processed
      if (this.hasEscalationBeenProcessed(alert.alert_id, escalationRule.level)) {
        logger.info(`Escalation level ${escalationRule.level} already processed for alert ${alert.alert_id}`);
        return;
      }

      // Send escalation notifications
      const notifications = await this.sendEscalationNotifications(alert, escalationRule);

      // Record escalation history
      const escalationHistory: EscalationHistory = {
        escalation_id: `esc_${alert.alert_id}_${escalationRule.level}_${Date.now()}`,
        alert_id: alert.alert_id,
        escalation_level: escalationRule.level,
        escalated_at: new Date(),
        escalated_to: escalationRule.recipients,
        channels_used: escalationRule.channels,
        success: notifications.every(n => n.success),
        error_message: notifications.find(n => !n.success)?.error
      };

      this.recordEscalationHistory(alert.alert_id, escalationHistory);

      logger.info(`Escalation level ${escalationRule.level} processed for alert ${alert.alert_id}`);
    } catch (error) {
      logger.error(`Error processing escalation for alert ${alert.alert_id}:`, error);
      throw error;
    }
  }

  /**
   * Send escalation notifications
   */
  private async sendEscalationNotifications(
    alert: Alert,
    escalationRule: EscalationRule
  ): Promise<any[]> {
    const notifications = [];
    const escalationTemplate = this.getEscalationTemplate(alert, escalationRule);

    for (const recipient of escalationRule.recipients) {
      for (const channel of escalationRule.channels) {
        try {
          const result = await this.notificationService.sendNotification(
            channel as any,
            recipient,
            escalationTemplate,
            alert
          );
          notifications.push(result);
        } catch (error) {
          logger.error(`Failed to send escalation notification via ${channel} to ${recipient}:`, error);
          notifications.push({
            success: false,
            notificationId: `failed_${Date.now()}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return notifications;
  }

  /**
   * Get escalation notification template
   */
  private getEscalationTemplate(alert: Alert, escalationRule: EscalationRule): any {
    const ageMinutes = alert.getAgeMinutes();
    
    return {
      subject: `🚨 ESCALATION Level ${escalationRule.level}: ${alert.title}`,
      body: `ESCALATED ALERT - Level ${escalationRule.level}

Alert ID: ${alert.alert_id}
Original Alert Time: ${alert.triggered_at.toISOString()}
Alert Age: ${Math.round(ageMinutes)} minutes
Severity: ${alert.severity.toUpperCase()}
Status: ${alert.status.toUpperCase()}

${alert.message}

This alert has been escalated because it has not been acknowledged or resolved within the expected timeframe.

Location: ${alert.location ? `${alert.location.latitude}, ${alert.location.longitude}` : 'Unknown'}

IMMEDIATE ACTION REQUIRED

Previous notifications may have failed or gone unacknowledged. Please respond immediately.`,
      priority: 'urgent'
    };
  }

  /**
   * Check if escalation should proceed based on business rules
   */
  private shouldEscalate(alert: Alert, escalationRule: EscalationRule): boolean {
    // Check if auto-escalation is enabled
    if (!this.escalationConfig.autoEscalationEnabled) {
      return false;
    }

    // Check if alert is still active
    if (!alert.isActive()) {
      return false;
    }

    // Check if enough time has passed
    const ageMinutes = alert.getAgeMinutes();
    if (ageMinutes < escalationRule.delay_minutes) {
      return false;
    }

    // Check business hours restriction
    if (this.escalationConfig.businessHoursOnly && !this.isBusinessHours()) {
      return false;
    }

    // Check weekend restriction
    if (!this.escalationConfig.weekendsEnabled && this.isWeekend()) {
      return false;
    }

    // Check maximum escalation level
    if (escalationRule.level > this.escalationConfig.maxEscalationLevel) {
      return false;
    }

    // Check escalation conditions
    if (escalationRule.conditions && escalationRule.conditions.length > 0) {
      return this.evaluateEscalationConditions(alert, escalationRule.conditions);
    }

    return true;
  }

  /**
   * Check if current time is within business hours
   */
  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    return hour >= this.escalationConfig.businessHours.start && 
           hour <= this.escalationConfig.businessHours.end;
  }

  /**
   * Check if current day is weekend
   */
  private isWeekend(): boolean {
    const now = new Date();
    const day = now.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  /**
   * Evaluate escalation conditions
   */
  private evaluateEscalationConditions(alert: Alert, conditions: string[]): boolean {
    for (const condition of conditions) {
      if (!this.evaluateCondition(alert, condition)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate individual escalation condition
   */
  private evaluateCondition(alert: Alert, condition: string): boolean {
    try {
      // Simple condition evaluation - in production, this would be more sophisticated
      switch (condition) {
        case 'not_acknowledged':
          return !alert.isAcknowledged();
        case 'critical_severity':
          return alert.severity === 'critical' || alert.severity === 'emergency';
        case 'high_priority':
          return alert.calculatePriorityScore() >= 70;
        case 'location_sensitive':
          return alert.hasTag('sensitive_area');
        case 'multiple_failures':
          return alert.hasTag('cascade_failure');
        default:
          logger.warn(`Unknown escalation condition: ${condition}`);
          return true;
      }
    } catch (error) {
      logger.error(`Error evaluating condition ${condition}:`, error);
      return true; // Default to escalate on error
    }
  }

  /**
   * Check if escalation level has been processed
   */
  private hasEscalationBeenProcessed(alertId: string, level: number): boolean {
    const history = this.escalationHistory.get(alertId) || [];
    return history.some(h => h.escalation_level === level);
  }

  /**
   * Record escalation history
   */
  private recordEscalationHistory(alertId: string, escalation: EscalationHistory): void {
    const history = this.escalationHistory.get(alertId) || [];
    history.push(escalation);
    this.escalationHistory.set(alertId, history);
  }

  /**
   * Get escalation history for an alert
   */
  getEscalationHistory(alertId: string): EscalationHistory[] {
    return this.escalationHistory.get(alertId) || [];
  }

  /**
   * Get escalation statistics
   */
  getEscalationStats(): {
    totalEscalations: number;
    successfulEscalations: number;
    failedEscalations: number;
    averageEscalationLevel: number;
    escalationsByLevel: Record<number, number>;
  } {
    let totalEscalations = 0;
    let successfulEscalations = 0;
    let failedEscalations = 0;
    let totalLevels = 0;
    const escalationsByLevel: Record<number, number> = {};

    for (const history of this.escalationHistory.values()) {
      for (const escalation of history) {
        totalEscalations++;
        totalLevels += escalation.escalation_level;
        
        if (escalation.success) {
          successfulEscalations++;
        } else {
          failedEscalations++;
        }

        escalationsByLevel[escalation.escalation_level] = 
          (escalationsByLevel[escalation.escalation_level] || 0) + 1;
      }
    }

    return {
      totalEscalations,
      successfulEscalations,
      failedEscalations,
      averageEscalationLevel: totalEscalations > 0 ? totalLevels / totalEscalations : 0,
      escalationsByLevel
    };
  }

  /**
   * Update escalation configuration
   */
  updateEscalationConfig(config: Partial<EscalationConfig>): void {
    this.escalationConfig = { ...this.escalationConfig, ...config };
    logger.info('Escalation configuration updated:', config);
  }

  /**
   * Get current escalation configuration
   */
  getEscalationConfig(): EscalationConfig {
    return { ...this.escalationConfig };
  }

  /**
   * Clear escalation history (for testing or maintenance)
   */
  clearEscalationHistory(alertId?: string): void {
    if (alertId) {
      this.escalationHistory.delete(alertId);
      logger.info(`Cleared escalation history for alert ${alertId}`);
    } else {
      this.escalationHistory.clear();
      logger.info('Cleared all escalation history');
    }
  }

  /**
   * Force escalation for an alert (manual override)
   */
  async forceEscalation(
    alert: Alert,
    escalationLevel: number,
    recipients: string[],
    channels: string[],
    reason: string
  ): Promise<void> {
    try {
      const escalationRule: EscalationRule = {
        level: escalationLevel,
        delay_minutes: 0,
        recipients,
        channels: channels as any,
        conditions: []
      };

      await this.processEscalation(alert, escalationRule);

      // Record as manual escalation
      const escalationHistory: EscalationHistory = {
        escalation_id: `manual_${alert.alert_id}_${escalationLevel}_${Date.now()}`,
        alert_id: alert.alert_id,
        escalation_level: escalationLevel,
        escalated_at: new Date(),
        escalated_to: recipients,
        channels_used: channels.filter(c => ['sms', 'email', 'push', 'webhook', 'radio'].includes(c)) as any,
        success: true,
        error_message: `Manual escalation: ${reason}`
      };

      this.recordEscalationHistory(alert.alert_id, escalationHistory);

      logger.info(`Manual escalation processed for alert ${alert.alert_id}: ${reason}`);
    } catch (error) {
      logger.error(`Error in manual escalation for alert ${alert.alert_id}:`, error);
      throw error;
    }
  }
}