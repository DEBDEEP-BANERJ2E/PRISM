import { Alert, AlertInput, AlertStatus, AlertSeverity, AlertType } from '@prism/shared-models/risk';
import { RiskAssessment } from '@prism/shared-models/risk';
import { logger } from '../utils/logger';
import { NotificationService } from './NotificationService';
import { PrescriptiveActionEngine } from './PrescriptiveActionEngine';
import { EscalationService } from './EscalationService';
import { AlertRepository } from '../repositories/AlertRepository';
import { DeduplicationService } from './DeduplicationService';
import { KafkaConsumer } from '../messaging/KafkaConsumer';
import { config } from '../config';

export interface AlertFilter {
  status?: AlertStatus[];
  severity?: AlertSeverity[];
  alertType?: AlertType[];
  startDate?: Date;
  endDate?: Date;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in meters
  };
  tags?: string[];
  sourceId?: string;
  acknowledged?: boolean;
  resolved?: boolean;
  suppressed?: boolean;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  suppressed: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<AlertType, number>;
  averageResolutionTimeMinutes: number;
  averageAcknowledgmentTimeMinutes: number;
  falsePositiveRate: number;
}

export class AlertManagementService {
  private alertRepository: AlertRepository;
  private deduplicationService: DeduplicationService;
  private kafkaConsumer: KafkaConsumer;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private notificationService: NotificationService,
    private prescriptiveActionEngine: PrescriptiveActionEngine,
    private escalationService: EscalationService
  ) {
    this.alertRepository = new AlertRepository();
    this.deduplicationService = new DeduplicationService();
    this.kafkaConsumer = new KafkaConsumer();
    
    this.initializeKafkaConsumer();
    this.startPeriodicProcessing();
  }

  /**
   * Initialize Kafka consumer for risk assessments and sensor events
   */
  private async initializeKafkaConsumer(): Promise<void> {
    try {
      await this.kafkaConsumer.connect();
      
      // Subscribe to risk assessment events
      await this.kafkaConsumer.subscribe('risk-assessments', async (payload) => {
        try {
          const riskAssessment = RiskAssessment.fromJSON(JSON.parse(payload.message.value?.toString() || '{}'));
          await this.processRiskAssessment(riskAssessment);
        } catch (error) {
          logger.error('Error processing risk assessment message:', error);
        }
      });
      
      // Subscribe to sensor events
      await this.kafkaConsumer.subscribe('sensor-events', async (payload) => {
        try {
          const sensorEvent = JSON.parse(payload.message.value?.toString() || '{}');
          await this.processSensorEvent(sensorEvent);
        } catch (error) {
          logger.error('Error processing sensor event message:', error);
        }
      });
      
      logger.info('Kafka consumer initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Kafka consumer:', error);
    }
  }

  /**
   * Start periodic processing for escalations and auto-resolution
   */
  private startPeriodicProcessing(): void {
    const intervalMs = config.alertProcessing.escalationCheckIntervalMinutes * 60 * 1000;
    
    this.processingInterval = setInterval(async () => {
      try {
        await this.processEscalations();
        await this.processAutoResolutions();
      } catch (error) {
        logger.error('Error in periodic processing:', error);
      }
    }, intervalMs);
    
    logger.info(`Started periodic processing with ${config.alertProcessing.escalationCheckIntervalMinutes} minute intervals`);
  }

  /**
   * Create a new alert with deduplication and prescriptive actions
   */
  async createAlert(alertInput: AlertInput): Promise<Alert> {
    try {
      // Check for duplicates
      const isDuplicate = await this.deduplicationService.isDuplicate(alertInput);
      if (isDuplicate) {
        logger.info(`Duplicate alert detected for ${alertInput.alert_type}, skipping creation`);
        const existingAlert = await this.deduplicationService.getExistingAlert(alertInput);
        if (existingAlert) {
          return existingAlert;
        }
      }

      // Generate prescriptive actions if this is a risk alert
      let enhancedInput = { ...alertInput };
      if (alertInput.alert_type === 'rockfall_risk' && alertInput.source_id) {
        try {
          const actions = await this.prescriptiveActionEngine.generateActions(alertInput);
          enhancedInput.metadata = {
            ...enhancedInput.metadata,
            prescriptive_actions: actions
          };
        } catch (error) {
          logger.warn('Failed to generate prescriptive actions:', error);
        }
      }

      // Create the alert
      const alert = new Alert(enhancedInput);
      
      // Save to database
      await this.alertRepository.create(alert);
      
      // Send initial notifications
      await this.notificationService.sendInitialNotifications(alert);
      
      // Register for deduplication
      await this.deduplicationService.registerAlert(alert);
      
      logger.info(`Created alert ${alert.alert_id} with severity ${alert.severity}`);
      
      return alert;
    } catch (error) {
      logger.error('Error creating alert:', error);
      throw error;
    }
  }

  /**
   * Process risk assessment and create alerts if necessary
   */
  async processRiskAssessment(riskAssessment: RiskAssessment): Promise<Alert | null> {
    try {
      // Determine if alert is needed based on risk level and probability
      const shouldCreateAlert = this.shouldCreateAlertForRisk(riskAssessment);
      
      if (!shouldCreateAlert) {
        logger.debug(`Risk assessment ${riskAssessment.assessment_id} does not require alert`);
        return null;
      }

      // Create alert from risk assessment
      const alert = Alert.createRiskAlert(
        {
          assessment_id: riskAssessment.assessment_id,
          risk_level: riskAssessment.risk_level,
          risk_probability: riskAssessment.risk_probability,
          explanation: riskAssessment.explanation
        },
        riskAssessment.centroid?.toJSON()
      );

      // Add risk-specific metadata
      const enhancedAlert = new Alert({
        ...alert.toJSON(),
        metadata: {
          ...alert.metadata,
          time_to_failure_hours: riskAssessment.time_to_failure_hours,
          contributing_factors: riskAssessment.contributing_factors,
          affected_infrastructure: riskAssessment.affected_infrastructure,
          total_estimated_cost: riskAssessment.getTotalEstimatedCost()
        },
        escalation_rules: this.generateEscalationRules(riskAssessment.risk_level)
      });

      return await this.createAlert(enhancedAlert.toJSON());
    } catch (error) {
      logger.error('Error processing risk assessment:', error);
      throw error;
    }
  }

  /**
   * Process sensor events and create alerts for failures
   */
  async processSensorEvent(sensorEvent: any): Promise<Alert | null> {
    try {
      const { sensorId, eventType, message, location, severity } = sensorEvent;
      
      // Map sensor event types to alert types
      const alertTypeMap: Record<string, AlertType> = {
        'failure': 'sensor_failure',
        'battery_low': 'battery_low',
        'communication_loss': 'communication_loss',
        'calibration_due': 'calibration_due',
        'maintenance_required': 'maintenance_required'
      };

      const alertType = alertTypeMap[eventType];
      if (!alertType) {
        logger.debug(`Sensor event type ${eventType} does not require alert`);
        return null;
      }

      // Only use valid sensor alert types
      const validSensorAlertTypes: ('sensor_failure' | 'battery_low' | 'communication_loss' | 'calibration_due')[] = 
        ['sensor_failure', 'battery_low', 'communication_loss', 'calibration_due'];
      
      if (!validSensorAlertTypes.includes(alertType as any)) {
        logger.debug(`Invalid sensor alert type: ${alertType}`);
        return null;
      }

      const alert = Alert.createSensorAlert(sensorId, alertType as any, message, location);
      
      return await this.createAlert(alert.toJSON());
    } catch (error) {
      logger.error('Error processing sensor event:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<Alert> {
    try {
      const alert = await this.alertRepository.findById(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      if (alert.isAcknowledged()) {
        logger.info(`Alert ${alertId} is already acknowledged`);
        return alert;
      }

      const updatedAlert = await this.alertRepository.update(alertId, {
        status: 'acknowledged',
        acknowledged_at: new Date(),
        acknowledged_by: acknowledgedBy,
        updated_at: new Date()
      });

      logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
      
      return updatedAlert;
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution?: string): Promise<Alert> {
    try {
      const alert = await this.alertRepository.findById(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      if (alert.isResolved()) {
        logger.info(`Alert ${alertId} is already resolved`);
        return alert;
      }

      const updatedAlert = await this.alertRepository.update(alertId, {
        status: 'resolved',
        resolved_at: new Date(),
        resolved_by: resolvedBy,
        metadata: {
          ...alert.metadata,
          resolution: resolution
        },
        updated_at: new Date()
      });

      logger.info(`Alert ${alertId} resolved by ${resolvedBy}`);
      
      return updatedAlert;
    } catch (error) {
      logger.error('Error resolving alert:', error);
      throw error;
    }
  }

  /**
   * Suppress an alert for a specified duration
   */
  async suppressAlert(alertId: string, suppressedBy: string, durationMinutes: number): Promise<Alert> {
    try {
      const alert = await this.alertRepository.findById(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      const suppressedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

      const updatedAlert = await this.alertRepository.update(alertId, {
        status: 'suppressed',
        suppressed_until: suppressedUntil,
        metadata: {
          ...alert.metadata,
          suppressed_by: suppressedBy,
          suppression_reason: 'Manual suppression'
        },
        updated_at: new Date()
      });

      logger.info(`Alert ${alertId} suppressed by ${suppressedBy} until ${suppressedUntil}`);
      
      return updatedAlert;
    } catch (error) {
      logger.error('Error suppressing alert:', error);
      throw error;
    }
  }

  /**
   * Get alerts with filtering and pagination
   */
  async getAlerts(
    filter: AlertFilter = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ alerts: Alert[]; total: number; page: number; totalPages: number }> {
    try {
      const result = await this.alertRepository.findWithFilter(filter, page, limit);
      
      return {
        alerts: result.alerts,
        total: result.total,
        page,
        totalPages: Math.ceil(result.total / limit)
      };
    } catch (error) {
      logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(filter: AlertFilter = {}): Promise<AlertStats> {
    try {
      return await this.alertRepository.getStats(filter);
    } catch (error) {
      logger.error('Error getting alert stats:', error);
      throw error;
    }
  }

  /**
   * Get active alerts requiring attention
   */
  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const filter: AlertFilter = {
        status: ['active'],
        acknowledged: false
      };
      
      const result = await this.alertRepository.findWithFilter(filter, 1, 1000);
      return result.alerts;
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      throw error;
    }
  }

  /**
   * Process escalations for overdue alerts
   */
  private async processEscalations(): Promise<void> {
    try {
      const activeAlerts = await this.getActiveAlerts();
      
      for (const alert of activeAlerts) {
        const nextEscalation = alert.getNextEscalationLevel();
        if (nextEscalation) {
          await this.escalationService.processEscalation(alert, nextEscalation);
          logger.info(`Processed escalation for alert ${alert.alert_id} to level ${nextEscalation.level}`);
        }
      }
    } catch (error) {
      logger.error('Error processing escalations:', error);
    }
  }

  /**
   * Process auto-resolutions for eligible alerts
   */
  private async processAutoResolutions(): Promise<void> {
    try {
      const filter: AlertFilter = {
        status: ['active', 'acknowledged']
      };
      
      const result = await this.alertRepository.findWithFilter(filter, 1, 1000);
      
      for (const alert of result.alerts) {
        if (alert.shouldAutoResolve()) {
          await this.resolveAlert(alert.alert_id, 'system', 'Auto-resolved due to timeout');
          logger.info(`Auto-resolved alert ${alert.alert_id}`);
        }
      }
    } catch (error) {
      logger.error('Error processing auto-resolutions:', error);
    }
  }

  /**
   * Determine if a risk assessment should create an alert
   */
  private shouldCreateAlertForRisk(riskAssessment: RiskAssessment): boolean {
    // Create alerts for medium risk and above, or high probability regardless of level
    return riskAssessment.risk_level !== 'very_low' && riskAssessment.risk_level !== 'low' ||
           riskAssessment.risk_probability >= 0.7;
  }

  /**
   * Generate escalation rules based on risk level
   */
  private generateEscalationRules(riskLevel: string): any[] {
    const baseRules = [
      {
        level: 1,
        delay_minutes: 15,
        recipients: ['supervisor@mine.com'],
        channels: ['email', 'sms'],
        conditions: []
      },
      {
        level: 2,
        delay_minutes: 30,
        recipients: ['manager@mine.com'],
        channels: ['email', 'sms', 'push'],
        conditions: []
      }
    ];

    // Add immediate escalation for critical risks
    if (riskLevel === 'critical') {
      baseRules.unshift({
        level: 0,
        delay_minutes: 0,
        recipients: ['emergency@mine.com'],
        channels: ['sms', 'push', 'webhook'],
        conditions: []
      });
    }

    return baseRules;
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }
      
      await this.kafkaConsumer.disconnect();
      await this.alertRepository.close();
      
      logger.info('Alert Management Service shut down successfully');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}