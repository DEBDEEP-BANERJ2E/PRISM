import { HexapodStatus, HexapodStatusSchema, type PowerStatus, type CommunicationStatus } from '../HexapodStatus';

describe('HexapodStatus', () => {
  const validPowerStatus: PowerStatus = {
    battery_percentage: 75,
    voltage: 12.5,
    current: -0.5,
    power_consumption: 6.25,
    charging: false,
    solar_panel_voltage: 18.2,
    estimated_runtime_hours: 48
  };

  const validCommunicationStatus: CommunicationStatus = {
    connection_type: 'lora',
    signal_strength: -75,
    data_rate: 250,
    packet_loss_rate: 0.02,
    last_successful_transmission: new Date(Date.now() - 300000), // 5 minutes ago
    failed_transmission_count: 1,
    total_data_transmitted: 1024000
  };

  const validHexapodData = {
    pod_id: 'HEX001',
    location: {
      latitude: 45.5231,
      longitude: -122.6765,
      elevation: 100
    },
    operational_mode: 'active' as const,
    sensor_health: {
      tilt_sensor: 'healthy' as const,
      temperature_sensor: 'healthy' as const,
      piezometer: 'warning' as const
    },
    last_communication: new Date(Date.now() - 60000), // 1 minute ago
    power_status: validPowerStatus,
    communication_status: validCommunicationStatus,
    firmware_version: '1.2.3',
    hardware_version: '2.1.0',
    uptime_seconds: 86400,
    reboot_count: 2,
    data_collection_interval: 300
  };

  describe('constructor and validation', () => {
    it('should create a valid HexapodStatus with required fields', () => {
      const status = new HexapodStatus(validHexapodData);
      
      expect(status.pod_id).toBe('HEX001');
      expect(status.operational_mode).toBe('active');
      expect(status.location.latitude).toBe(45.5231);
      expect(status.power_status.battery_percentage).toBe(75);
      expect(status.communication_status.connection_type).toBe('lora');
      expect(status.sensor_health.tilt_sensor).toBe('healthy');
      expect(status.created_at).toBeInstanceOf(Date);
      expect(status.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for invalid operational mode', () => {
      const invalidData = { ...validHexapodData, operational_mode: 'invalid_mode' as any };
      expect(() => new HexapodStatus(invalidData)).toThrow();
    });

    it('should throw error for invalid battery percentage', () => {
      const invalidData = {
        ...validHexapodData,
        power_status: { ...validPowerStatus, battery_percentage: 150 }
      };
      expect(() => new HexapodStatus(invalidData)).toThrow();
    });

    it('should throw error for invalid signal strength', () => {
      const invalidData = {
        ...validHexapodData,
        communication_status: { ...validCommunicationStatus, signal_strength: 10 }
      };
      expect(() => new HexapodStatus(invalidData)).toThrow();
    });

    it('should accept optional environmental conditions', () => {
      const dataWithEnvironment = {
        ...validHexapodData,
        environmental_conditions: {
          temperature: 23.5,
          humidity: 65,
          pressure: 1013.25,
          wind_speed: 5.2
        }
      };
      
      const status = new HexapodStatus(dataWithEnvironment);
      expect(status.environmental_conditions).toBeDefined();
      expect(status.environmental_conditions!.temperature).toBe(23.5);
    });
  });

  describe('status assessment methods', () => {
    it('should detect online status correctly', () => {
      const recentTime = new Date(Date.now() - 300000); // 5 minutes ago
      const onlineStatus = new HexapodStatus({
        ...validHexapodData,
        last_communication: recentTime
      });
      
      expect(onlineStatus.isOnline()).toBe(true);
    });

    it('should detect offline status correctly', () => {
      const oldTime = new Date(Date.now() - 900000); // 15 minutes ago
      const offlineStatus = new HexapodStatus({
        ...validHexapodData,
        last_communication: oldTime
      });
      
      expect(offlineStatus.isOnline()).toBe(false);
    });

    it('should assess healthy status correctly', () => {
      const healthyStatus = new HexapodStatus({
        ...validHexapodData,
        power_status: { ...validPowerStatus, battery_percentage: 80 },
        sensor_health: {
          tilt_sensor: 'healthy',
          temperature_sensor: 'healthy'
        },
        last_communication: new Date(Date.now() - 60000) // 1 minute ago
      });
      
      expect(healthyStatus.isHealthy()).toBe(true);
    });

    it('should detect unhealthy status for low battery', () => {
      const lowBatteryStatus = new HexapodStatus({
        ...validHexapodData,
        power_status: { ...validPowerStatus, battery_percentage: 15 }
      });
      
      expect(lowBatteryStatus.isHealthy()).toBe(false);
    });

    it('should detect unhealthy status for critical sensors', () => {
      const criticalSensorStatus = new HexapodStatus({
        ...validHexapodData,
        sensor_health: {
          tilt_sensor: 'critical',
          temperature_sensor: 'healthy'
        }
      });
      
      expect(criticalSensorStatus.isHealthy()).toBe(false);
    });
  });

  describe('overall health assessment', () => {
    it('should return offline for old communication', () => {
      const offlineStatus = new HexapodStatus({
        ...validHexapodData,
        last_communication: new Date(Date.now() - 900000) // 15 minutes ago
      });
      
      expect(offlineStatus.getOverallHealth()).toBe('offline');
    });

    it('should return maintenance_required for maintenance mode', () => {
      const maintenanceStatus = new HexapodStatus({
        ...validHexapodData,
        operational_mode: 'maintenance'
      });
      
      expect(maintenanceStatus.getOverallHealth()).toBe('maintenance_required');
    });

    it('should return critical for critical sensors', () => {
      const criticalStatus = new HexapodStatus({
        ...validHexapodData,
        sensor_health: {
          tilt_sensor: 'critical',
          temperature_sensor: 'healthy'
        }
      });
      
      expect(criticalStatus.getOverallHealth()).toBe('critical');
    });

    it('should return warning for low battery or warning sensors', () => {
      const warningStatus = new HexapodStatus({
        ...validHexapodData,
        power_status: { ...validPowerStatus, battery_percentage: 8 }
      });
      
      expect(warningStatus.getOverallHealth()).toBe('warning');
    });

    it('should return healthy for good conditions', () => {
      const healthyStatus = new HexapodStatus({
        ...validHexapodData,
        power_status: { ...validPowerStatus, battery_percentage: 80 },
        sensor_health: {
          tilt_sensor: 'healthy',
          temperature_sensor: 'healthy'
        }
      });
      
      expect(healthyStatus.getOverallHealth()).toBe('healthy');
    });
  });

  describe('sensor management', () => {
    it('should identify critical sensors', () => {
      const status = new HexapodStatus({
        ...validHexapodData,
        sensor_health: {
          tilt_sensor: 'critical',
          temperature_sensor: 'healthy',
          piezometer: 'offline'
        }
      });
      
      const criticalSensors = status.getCriticalSensors();
      expect(criticalSensors).toContain('tilt_sensor');
      expect(criticalSensors).toContain('piezometer');
      expect(criticalSensors).not.toContain('temperature_sensor');
    });

    it('should return empty array when no critical sensors', () => {
      const status = new HexapodStatus({
        ...validHexapodData,
        sensor_health: {
          tilt_sensor: 'healthy',
          temperature_sensor: 'warning'
        }
      });
      
      expect(status.getCriticalSensors()).toEqual([]);
    });
  });

  describe('maintenance and calibration', () => {
    it('should detect when maintenance is due', () => {
      const maintenanceDueStatus = new HexapodStatus({
        ...validHexapodData,
        maintenance_due_date: new Date(Date.now() - 86400000) // Yesterday
      });
      
      expect(maintenanceDueStatus.isMaintenanceDue()).toBe(true);
    });

    it('should detect when maintenance is not due', () => {
      const maintenanceNotDueStatus = new HexapodStatus({
        ...validHexapodData,
        maintenance_due_date: new Date(Date.now() + 86400000) // Tomorrow
      });
      
      expect(maintenanceNotDueStatus.isMaintenanceDue()).toBe(false);
    });

    it('should detect when calibration is due', () => {
      const oldCalibrationStatus = new HexapodStatus({
        ...validHexapodData,
        last_calibration_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // 35 days ago
      });
      
      expect(oldCalibrationStatus.isCalibrationDue()).toBe(true);
    });

    it('should detect when calibration is not due', () => {
      const recentCalibrationStatus = new HexapodStatus({
        ...validHexapodData,
        last_calibration_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
      });
      
      expect(recentCalibrationStatus.isCalibrationDue()).toBe(false);
    });

    it('should require calibration when never calibrated', () => {
      const neverCalibratedStatus = new HexapodStatus({
        ...validHexapodData,
        last_calibration_date: undefined
      });
      
      expect(neverCalibratedStatus.isCalibrationDue()).toBe(true);
    });
  });

  describe('battery and power management', () => {
    it('should estimate battery life correctly', () => {
      const status = new HexapodStatus({
        ...validHexapodData,
        power_status: {
          ...validPowerStatus,
          battery_percentage: 50,
          power_consumption: 5.0 // 5W
        }
      });
      
      const batteryLife = status.getEstimatedBatteryLife();
      expect(batteryLife).toBeGreaterThan(0);
      expect(batteryLife).toBeLessThan(100); // Should be reasonable
    });

    it('should use provided estimated runtime', () => {
      const status = new HexapodStatus({
        ...validHexapodData,
        power_status: {
          ...validPowerStatus,
          estimated_runtime_hours: 24
        }
      });
      
      expect(status.getEstimatedBatteryLife()).toBe(24);
    });
  });

  describe('communication quality', () => {
    it('should calculate communication quality correctly', () => {
      const goodCommStatus = new HexapodStatus({
        ...validHexapodData,
        communication_status: {
          ...validCommunicationStatus,
          signal_strength: -50, // Good signal
          packet_loss_rate: 0.01, // Low packet loss
          failed_transmission_count: 2 // Few failures
        }
      });
      
      const quality = goodCommStatus.getCommunicationQuality();
      expect(quality).toBeGreaterThan(0.8);
      expect(quality).toBeLessThanOrEqual(1.0);
    });

    it('should penalize poor signal strength', () => {
      const poorSignalStatus = new HexapodStatus({
        ...validHexapodData,
        communication_status: {
          ...validCommunicationStatus,
          signal_strength: -110, // Poor signal
          packet_loss_rate: 0.0,
          failed_transmission_count: 0
        }
      });
      
      const quality = poorSignalStatus.getCommunicationQuality();
      expect(quality).toBeLessThan(0.8);
    });
  });

  describe('utility methods', () => {
    it('should format uptime correctly', () => {
      const status = new HexapodStatus({
        ...validHexapodData,
        uptime_seconds: 90061 // 1 day, 1 hour, 1 minute, 1 second
      });
      
      const uptimeString = status.getUptimeString();
      expect(uptimeString).toBe('1d 1h 1m');
    });

    it('should handle undefined uptime', () => {
      const status = new HexapodStatus({
        ...validHexapodData,
        uptime_seconds: undefined
      });
      
      expect(status.getUptimeString()).toBe('Unknown');
    });
  });

  describe('status summary', () => {
    it('should create comprehensive status summary', () => {
      const status = new HexapodStatus(validHexapodData);
      const summary = status.getStatusSummary();
      
      expect(summary.pod_id).toBe('HEX001');
      expect(summary.overall_health).toBeDefined();
      expect(summary.battery_percentage).toBe(75);
      expect(summary.is_online).toBeDefined();
      expect(summary.critical_sensors).toBeInstanceOf(Array);
      expect(summary.maintenance_due).toBeDefined();
      expect(summary.calibration_due).toBeDefined();
      expect(summary.communication_quality).toBeDefined();
      expect(summary.last_seen).toEqual(validHexapodData.last_communication);
    });
  });

  describe('data format conversions', () => {
    it('should convert to InfluxDB line protocol', () => {
      const status = new HexapodStatus({
        ...validHexapodData,
        environmental_conditions: {
          temperature: 23.5,
          humidity: 65
        }
      });
      
      const lineProtocol = status.toInfluxLineProtocol();
      
      expect(lineProtocol).toContain('hexapod_status,pod_id=HEX001,operational_mode=active');
      expect(lineProtocol).toContain('battery_percentage=75');
      expect(lineProtocol).toContain('signal_strength=-75');
      expect(lineProtocol).toContain('temperature=23.5');
      expect(lineProtocol).toContain('humidity=65');
      expect(lineProtocol).toContain('uptime_seconds=86400');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize to JSON', () => {
      const status = new HexapodStatus(validHexapodData);
      const json = status.toJSON();
      
      expect(json.pod_id).toBe('HEX001');
      expect(json.operational_mode).toBe('active');
      expect(json.location).toBeDefined();
      expect(json.power_status).toEqual(validPowerStatus);
      expect(json.communication_status).toEqual(validCommunicationStatus);
    });

    it('should create from JSON', () => {
      const json = {
        ...validHexapodData,
        last_communication: '2023-01-01T12:00:00.000Z',
        created_at: '2023-01-01T12:00:01.000Z',
        power_status: {
          ...validPowerStatus,
          last_charge_date: '2023-01-01T06:00:00.000Z'
        },
        communication_status: {
          ...validCommunicationStatus,
          last_successful_transmission: '2023-01-01T11:55:00.000Z'
        }
      };
      
      const status = HexapodStatus.fromJSON(json);
      
      expect(status.pod_id).toBe('HEX001');
      expect(status.last_communication).toEqual(new Date('2023-01-01T12:00:00.000Z'));
      expect(status.created_at).toEqual(new Date('2023-01-01T12:00:01.000Z'));
    });
  });

  describe('validation methods', () => {
    it('should validate correct data', () => {
      expect(() => HexapodStatus.validate(validHexapodData)).not.toThrow();
    });

    it('should reject invalid data', () => {
      const invalidData = { ...validHexapodData, pod_id: '' };
      expect(() => HexapodStatus.validate(invalidData)).toThrow();
    });

    it('should validate power status constraints', () => {
      const invalidPowerData = {
        ...validHexapodData,
        power_status: { ...validPowerStatus, voltage: -5 } // Negative voltage
      };
      
      expect(() => HexapodStatus.validate(invalidPowerData)).toThrow();
    });

    it('should validate communication status constraints', () => {
      const invalidCommData = {
        ...validHexapodData,
        communication_status: {
          ...validCommunicationStatus,
          packet_loss_rate: 1.5 // > 1.0
        }
      };
      
      expect(() => HexapodStatus.validate(invalidCommData)).toThrow();
    });
  });
});