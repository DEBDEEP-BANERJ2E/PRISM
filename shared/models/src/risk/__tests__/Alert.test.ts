import { Alert, AlertSchema, type EscalationRule, type AlertNotification } from '../Alert';

describe('Alert', () => {
  const validEscalationRules: EscalationRule[] = [
    {
      level: 1,
      delay_minutes: 0,
      recipients: ['operator1@example.com'],
      channels: ['email', 'sms'],
      conditions: []
    },
    {
      level: 2,
      delay_minutes: 15,
      recipients: ['supervisor@example.com'],
      channels: ['email', 'push'],
      conditions: []
    },
    {
      level: 3,
      delay_minutes: 60,
      recipients: ['manager@example.com'],
      channels: ['email', 'radio'],
      conditions: []
    }
  ];

  const validNotifications: AlertNotification[] = [
    {
      notification_id: 'NOTIF001',
      channel: 'email',
      recipient: 'operator1@example.com',
      sent_at: new Date('2023-01-01T12:01:00Z'),
      delivered_at: new Date('2023-01-01T12:01:30Z'),
      status: 'delivered',
      retry_count: 0
    },
    {
      notification_id: 'NOTIF002',
      channel: 'sms',
      recipient: '+1234567890',
      sent_at: new Date('2023-01-01T12:01:00Z'),
      status: 'failed',
      error_message: 'Network timeout',
      retry_count: 1
    }
  ];

  const validAlertData = {
    alert_id: 'ALERT001',
    alert_type: 'rockfall_risk' as const,
    severity: 'critical' as const,
    title: 'High Rockfall Risk Detected',
    message: 'Risk probability: 85.0%. Heavy rainfall and steep slope conditions detected.',
    risk_level: 'high' as const,
    source_id: 'RISK001',
    source_type: 'risk_assessment',
    triggered_at: new Date('2023-01-01T12:00:00Z'),
    escalation_rules: validEscalationRules,
    notifications: validNotifications,
    related_alerts: ['ALERT002', 'ALERT003'],
    metadata: {
      risk_probability: 0.85,
      affected_area: 'Sector A'
    },
    tags: ['rockfall', 'high_risk', 'sector_a'],
    priority_score: 85,
    auto_resolve: false
  };

  describe('constructor and validation', () => {
    it('should create a valid Alert with required fields', () => {
      const alert = new Alert(validAlertData);
      
      expect(alert.alert_id).toBe('ALERT001');
      expect(alert.alert_type).toBe('rockfall_risk');
      expect(alert.severity).toBe('critical');
      expect(alert.status).toBe('active'); // Default status
      expect(alert.escalation_rules).toHaveLength(3);
      expect(alert.notifications).toHaveLength(2);
      expect(alert.created_at).toBeInstanceOf(Date);
      expect(alert.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for invalid alert type', () => {
      const invalidData = { ...validAlertData, alert_type: 'invalid_type' as any };
      expect(() => new Alert(invalidData)).toThrow();
    });

    it('should throw error for invalid severity', () => {
      const invalidData = { ...validAlertData, severity: 'invalid_severity' as any };
      expect(() => new Alert(invalidData)).toThrow();
    });

    it('should throw error for invalid status', () => {
      const invalidData = { ...validAlertData, status: 'invalid_status' as any };
      expect(() => new Alert(invalidData)).toThrow();
    });

    it('should accept optional location', () => {
      const dataWithLocation = {
        ...validAlertData,
        location: {
          latitude: 45.5231,
          longitude: -122.6765,
          elevation: 100
        }
      };
      
      const alert = new Alert(dataWithLocation);
      expect(alert.location).toBeDefined();
      expect(alert.location!.latitude).toBe(45.5231);
    });
  });

  describe('status checks', () => {
    it('should detect active alerts', () => {
      const alert = new Alert({ ...validAlertData, status: 'active' });
      expect(alert.isActive()).toBe(true);
    });

    it('should detect non-active alerts', () => {
      const alert = new Alert({ ...validAlertData, status: 'resolved' });
      expect(alert.isActive()).toBe(false);
    });

    it('should detect acknowledged alerts', () => {
      const alert = new Alert({
        ...validAlertData,
        status: 'acknowledged',
        acknowledged_at: new Date('2023-01-01T12:05:00Z'),
        acknowledged_by: 'operator1'
      });
      
      expect(alert.isAcknowledged()).toBe(true);
    });

    it('should detect resolved alerts', () => {
      const alert = new Alert({
        ...validAlertData,
        status: 'resolved',
        resolved_at: new Date('2023-01-01T13:00:00Z'),
        resolved_by: 'supervisor1'
      });
      
      expect(alert.isResolved()).toBe(true);
    });

    it('should detect suppressed alerts', () => {
      const alert = new Alert({
        ...validAlertData,
        suppressed_until: new Date(Date.now() + 3600000) // 1 hour from now
      });
      
      expect(alert.isSuppressed()).toBe(true);
      expect(alert.isActive()).toBe(false); // Suppressed alerts are not active
    });

    it('should detect critical alerts', () => {
      const criticalAlert = new Alert({ ...validAlertData, severity: 'critical' });
      const emergencyAlert = new Alert({ ...validAlertData, severity: 'emergency' });
      const warningAlert = new Alert({ ...validAlertData, severity: 'warning' });
      
      expect(criticalAlert.isCritical()).toBe(true);
      expect(emergencyAlert.isCritical()).toBe(true);
      expect(warningAlert.isCritical()).toBe(false);
    });
  });

  describe('time-based methods', () => {
    it('should calculate age correctly', () => {
      const pastTime = new Date(Date.now() - 1800000); // 30 minutes ago
      const alert = new Alert({
        ...validAlertData,
        triggered_at: pastTime
      });
      
      const age = alert.getAgeMinutes();
      expect(age).toBeCloseTo(30, 1);
    });

    it('should calculate time since acknowledgment', () => {
      const alert = new Alert({
        ...validAlertData,
        acknowledged_at: new Date(Date.now() - 600000) // 10 minutes ago
      });
      
      const timeSince = alert.getTimeSinceAcknowledgmentMinutes();
      expect(timeSince).toBeCloseTo(10, 1);
    });

    it('should return undefined for non-acknowledged alerts', () => {
      const alert = new Alert(validAlertData);
      expect(alert.getTimeSinceAcknowledgmentMinutes()).toBeUndefined();
    });

    it('should calculate time to resolution', () => {
      const alert = new Alert({
        ...validAlertData,
        triggered_at: new Date('2023-01-01T12:00:00Z'),
        resolved_at: new Date('2023-01-01T12:30:00Z')
      });
      
      const timeToResolution = alert.getTimeToResolutionMinutes();
      expect(timeToResolution).toBe(30);
    });
  });

  describe('auto-resolution', () => {
    it('should detect when alert should be auto-resolved', () => {
      const oldTime = new Date(Date.now() - 7200000); // 2 hours ago
      const alert = new Alert({
        ...validAlertData,
        triggered_at: oldTime,
        auto_resolve: true,
        auto_resolve_after_minutes: 60
      });
      
      expect(alert.shouldAutoResolve()).toBe(true);
    });

    it('should not auto-resolve when disabled', () => {
      const oldTime = new Date(Date.now() - 7200000); // 2 hours ago
      const alert = new Alert({
        ...validAlertData,
        triggered_at: oldTime,
        auto_resolve: false,
        auto_resolve_after_minutes: 60
      });
      
      expect(alert.shouldAutoResolve()).toBe(false);
    });

    it('should not auto-resolve when time threshold not met', () => {
      const recentTime = new Date(Date.now() - 1800000); // 30 minutes ago
      const alert = new Alert({
        ...validAlertData,
        triggered_at: recentTime,
        auto_resolve: true,
        auto_resolve_after_minutes: 60
      });
      
      expect(alert.shouldAutoResolve()).toBe(false);
    });
  });

  describe('escalation management', () => {
    it('should get next escalation level', () => {
      const oldTime = new Date(Date.now() - 1800000); // 30 minutes ago
      const alert = new Alert({
        ...validAlertData,
        triggered_at: oldTime,
        notifications: [] // No notifications sent yet
      });
      
      const nextEscalation = alert.getNextEscalationLevel();
      expect(nextEscalation).toBeDefined();
      expect(nextEscalation!.level).toBe(1); // Should be level 1 (0 min delay) since no notifications sent
    });

    it('should return undefined when no escalation needed', () => {
      const recentTime = new Date(Date.now() - 300000); // 5 minutes ago
      const alert = new Alert({
        ...validAlertData,
        triggered_at: recentTime
      });
      
      const nextEscalation = alert.getNextEscalationLevel();
      expect(nextEscalation).toBeUndefined(); // Too early for level 2
    });
  });

  describe('notification management', () => {
    it('should get failed notifications', () => {
      const alert = new Alert(validAlertData);
      const failedNotifications = alert.getFailedNotifications();
      
      expect(failedNotifications).toHaveLength(1);
      expect(failedNotifications[0].notification_id).toBe('NOTIF002');
      expect(failedNotifications[0].status).toBe('failed');
    });

    it('should calculate notification success rate', () => {
      const alert = new Alert(validAlertData);
      const successRate = alert.getNotificationSuccessRate();
      
      expect(successRate).toBe(0.5); // 1 delivered out of 2 total
    });

    it('should return 1.0 success rate for no notifications', () => {
      const alert = new Alert({
        ...validAlertData,
        notifications: []
      });
      
      expect(alert.getNotificationSuccessRate()).toBe(1.0);
    });
  });

  describe('priority scoring', () => {
    it('should use provided priority score', () => {
      const alert = new Alert(validAlertData);
      expect(alert.calculatePriorityScore()).toBe(85);
    });

    it('should calculate priority score when not provided', () => {
      const alert = new Alert({
        ...validAlertData,
        priority_score: undefined
      });
      
      const score = alert.calculatePriorityScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher priority to critical alerts', () => {
      const criticalAlert = new Alert({
        ...validAlertData,
        severity: 'critical',
        priority_score: undefined
      });
      
      const warningAlert = new Alert({
        ...validAlertData,
        severity: 'warning',
        priority_score: undefined
      });
      
      expect(criticalAlert.calculatePriorityScore()).toBeGreaterThan(warningAlert.calculatePriorityScore());
    });

    it('should give higher priority to unacknowledged alerts', () => {
      const unacknowledgedAlert = new Alert({
        ...validAlertData,
        priority_score: undefined,
        acknowledged_at: undefined
      });
      
      const acknowledgedAlert = new Alert({
        ...validAlertData,
        priority_score: undefined,
        acknowledged_at: new Date()
      });
      
      expect(unacknowledgedAlert.calculatePriorityScore()).toBeGreaterThanOrEqual(acknowledgedAlert.calculatePriorityScore());
    });
  });

  describe('tag management', () => {
    it('should check if alert has specific tag', () => {
      const alert = new Alert(validAlertData);
      
      expect(alert.hasTag('rockfall')).toBe(true);
      expect(alert.hasTag('nonexistent')).toBe(false);
    });

    it('should check if alert has any of given tags', () => {
      const alert = new Alert(validAlertData);
      
      expect(alert.hasAnyTag(['rockfall', 'landslide'])).toBe(true);
      expect(alert.hasAnyTag(['landslide', 'flood'])).toBe(false);
    });
  });

  describe('summary generation', () => {
    it('should create comprehensive summary', () => {
      const alert = new Alert(validAlertData);
      const summary = alert.getSummary();
      
      expect(summary.alert_id).toBe('ALERT001');
      expect(summary.alert_type).toBe('rockfall_risk');
      expect(summary.severity).toBe('critical');
      expect(summary.status).toBe('active');
      expect(summary.title).toBe('High Rockfall Risk Detected');
      expect(summary.priority_score).toBe(85);
      expect(summary.is_acknowledged).toBe(false);
      expect(summary.is_suppressed).toBe(false);
      expect(summary.notification_success_rate).toBe(0.5);
    });

    it('should include location in summary when available', () => {
      const alertWithLocation = new Alert({
        ...validAlertData,
        location: {
          latitude: 45.5231,
          longitude: -122.6765,
          elevation: 100
        }
      });
      
      const summary = alertWithLocation.getSummary();
      expect(summary.location).toBeDefined();
      expect(summary.location!.latitude).toBe(45.5231);
      expect(summary.location!.longitude).toBe(-122.6765);
    });
  });

  describe('factory methods', () => {
    it('should create risk alert correctly', () => {
      const riskAssessment = {
        assessment_id: 'RISK001',
        risk_level: 'critical' as const,
        risk_probability: 0.9,
        explanation: 'Extreme conditions detected'
      };
      
      const alert = Alert.createRiskAlert(riskAssessment);
      
      expect(alert.alert_type).toBe('rockfall_risk');
      expect(alert.severity).toBe('emergency'); // Critical risk level -> emergency severity
      expect(alert.source_id).toBe('RISK001');
      expect(alert.source_type).toBe('risk_assessment');
      expect(alert.risk_level).toBe('critical');
      expect(alert.metadata.risk_probability).toBe(0.9);
      expect(alert.tags).toContain('rockfall');
      expect(alert.tags).toContain('critical');
    });

    it('should create sensor alert correctly', () => {
      const alert = Alert.createSensorAlert(
        'SENSOR001',
        'battery_low',
        'Battery level below 20%'
      );
      
      expect(alert.alert_type).toBe('battery_low');
      expect(alert.severity).toBe('warning');
      expect(alert.source_id).toBe('SENSOR001');
      expect(alert.source_type).toBe('sensor');
      expect(alert.message).toBe('Battery level below 20%');
      expect(alert.tags).toContain('sensor');
      expect(alert.tags).toContain('battery_low');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const alert = new Alert(validAlertData);
      const json = alert.toJSON();
      
      expect(json.alert_id).toBe('ALERT001');
      expect(json.alert_type).toBe('rockfall_risk');
      expect(json.escalation_rules).toHaveLength(3);
      expect(json.notifications).toHaveLength(2);
      expect(json.metadata).toEqual(validAlertData.metadata);
    });

    it('should create from JSON', () => {
      const json = {
        ...validAlertData,
        triggered_at: '2023-01-01T12:00:00.000Z',
        acknowledged_at: '2023-01-01T12:05:00.000Z',
        created_at: '2023-01-01T12:00:01.000Z',
        notifications: [
          {
            ...validNotifications[0],
            sent_at: '2023-01-01T12:01:00.000Z',
            delivered_at: '2023-01-01T12:01:30.000Z'
          }
        ]
      };
      
      const alert = Alert.fromJSON(json);
      
      expect(alert.alert_id).toBe('ALERT001');
      expect(alert.triggered_at).toEqual(new Date('2023-01-01T12:00:00.000Z'));
      expect(alert.acknowledged_at).toEqual(new Date('2023-01-01T12:05:00.000Z'));
      expect(alert.created_at).toEqual(new Date('2023-01-01T12:00:01.000Z'));
      expect(alert.notifications[0].sent_at).toEqual(new Date('2023-01-01T12:01:00.000Z'));
    });
  });

  describe('validation methods', () => {
    it('should validate correct data', () => {
      expect(() => Alert.validate(validAlertData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidData = { ...validAlertData, alert_id: '' };
      expect(() => Alert.validate(invalidData)).toThrow();
    });

    it('should validate escalation rule constraints', () => {
      const invalidEscalationData = {
        ...validAlertData,
        escalation_rules: [{
          level: -1, // Invalid negative level
          delay_minutes: 0,
          recipients: ['test@example.com'],
          channels: ['email']
        }]
      };
      
      expect(() => Alert.validate(invalidEscalationData)).toThrow();
    });

    it('should validate notification constraints', () => {
      const invalidNotificationData = {
        ...validAlertData,
        notifications: [{
          notification_id: '', // Empty ID
          channel: 'email',
          recipient: 'test@example.com',
          sent_at: new Date(),
          status: 'sent'
        }]
      };
      
      expect(() => Alert.validate(invalidNotificationData)).toThrow();
    });
  });

  describe('alert types', () => {
    const alertTypes = [
      'rockfall_risk', 'sensor_failure', 'communication_loss', 'battery_low',
      'calibration_due', 'maintenance_required', 'weather_warning', 'system_error'
    ];

    alertTypes.forEach(alertType => {
      it(`should accept ${alertType} alert type`, () => {
        const data = { ...validAlertData, alert_type: alertType as any };
        expect(() => new Alert(data)).not.toThrow();
      });
    });

    it('should reject invalid alert type', () => {
      const data = { ...validAlertData, alert_type: 'invalid_alert' as any };
      expect(() => new Alert(data)).toThrow();
    });
  });
});