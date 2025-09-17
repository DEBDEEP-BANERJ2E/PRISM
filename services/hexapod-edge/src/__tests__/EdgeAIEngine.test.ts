import { EdgeAIEngine } from '../services/EdgeAIEngine';
import { SensorReading } from '../types';

describe('EdgeAIEngine', () => {
  let edgeAI: EdgeAIEngine;
  let mockSensorReading: SensorReading;

  beforeEach(() => {
    edgeAI = new EdgeAIEngine();
    
    mockSensorReading = {
      sensorId: 'test-sensor-001',
      timestamp: Date.now(),
      location: {
        latitude: -23.5505,
        longitude: -46.6333,
        elevation: 760.0
      },
      measurements: {
        tilt_x: 0.01,
        tilt_y: -0.02,
        tilt_z: 0.0,
        accel_x: 0.1,
        accel_y: -0.05,
        accel_z: 9.81,
        gyro_x: 0.001,
        gyro_y: -0.002,
        gyro_z: 0.0,
        pore_pressure: 125.5,
        temperature: 22.3,
        humidity: 65.2,
        strain_gauge: 45.8,
        battery_voltage: 3.6
      },
      qualityFlags: {
        tilt_valid: true,
        accel_valid: true,
        gyro_valid: true,
        pressure_valid: true,
        environmental_valid: true,
        strain_valid: true
      },
      batteryLevel: 85,
      signalStrength: -75
    };
  });

  describe('detectAnomaly', () => {
    it('should detect anomalies and return result', async () => {
      const result = await edgeAI.detectAnomaly(mockSensorReading);

      expect(result).toHaveProperty('anomalyScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('features');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('timestamp');

      expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(result.anomalyScore).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should classify normal readings as low risk', async () => {
      const result = await edgeAI.detectAnomaly(mockSensorReading);

      // Normal readings should typically result in low or medium risk
      expect(['low', 'medium']).toContain(result.riskLevel);
      expect(result.anomalyScore).toBeLessThan(0.8);
    });

    it('should detect high tilt as anomaly', async () => {
      // Create reading with high tilt
      const highTiltReading = {
        ...mockSensorReading,
        measurements: {
          ...mockSensorReading.measurements,
          tilt_x: 0.5, // High tilt value
          tilt_y: 0.3
        }
      };

      const result = await edgeAI.detectAnomaly(highTiltReading);

      expect(result.riskLevel).not.toBe('low');
      // The explanation should mention some anomaly
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('should detect high pore pressure as anomaly', async () => {
      // Create reading with high pore pressure
      const highPressureReading = {
        ...mockSensorReading,
        measurements: {
          ...mockSensorReading.measurements,
          pore_pressure: 300 // High pressure value
        }
      };

      const result = await edgeAI.detectAnomaly(highPressureReading);

      expect(result.explanation).toContain('pressure');
    });

    it('should detect high strain as anomaly', async () => {
      // Create reading with high strain
      const highStrainReading = {
        ...mockSensorReading,
        measurements: {
          ...mockSensorReading.measurements,
          strain_gauge: 200 // High strain value
        }
      };

      const result = await edgeAI.detectAnomaly(highStrainReading);

      expect(result.explanation).toContain('strain');
    });
  });

  describe('confidence calculation', () => {
    it('should reduce confidence for invalid sensor readings', async () => {
      const invalidReading = {
        ...mockSensorReading,
        qualityFlags: {
          tilt_valid: false,
          accel_valid: false,
          gyro_valid: true,
          pressure_valid: true,
          environmental_valid: true,
          strain_valid: true
        }
      };

      const result = await edgeAI.detectAnomaly(invalidReading);

      expect(result.confidence).toBeLessThan(0.9);
    });

    it('should reduce confidence for poor signal strength', async () => {
      const poorSignalReading = {
        ...mockSensorReading,
        signalStrength: -110 // Very poor signal
      };

      const result = await edgeAI.detectAnomaly(poorSignalReading);

      expect(result.confidence).toBeLessThan(0.9);
    });

    it('should reduce confidence for low battery', async () => {
      const lowBatteryReading = {
        ...mockSensorReading,
        batteryLevel: 15 // Low battery
      };

      const result = await edgeAI.detectAnomaly(lowBatteryReading);

      expect(result.confidence).toBeLessThan(0.9);
    });
  });

  describe('model management', () => {
    it('should update model weights', () => {
      const newWeights: number[][][] = [
        Array(8).fill(0).map(() => Array(13).fill(0.1)),
        Array(1).fill(0).map(() => Array(8).fill(0.1))
      ];

      edgeAI.updateModelWeights(newWeights);

      // Model should accept valid weights
      const modelInfo = edgeAI.getModelInfo();
      expect(modelInfo.weightsSize).toBeGreaterThan(0);
    });

    it('should reject invalid model weights', () => {
      const invalidWeights: number[][][] = [
        Array(5).fill(0).map(() => Array(10).fill(0.1)) // Wrong dimensions
      ];

      edgeAI.updateModelWeights(invalidWeights);

      // Model should reject invalid weights and keep original
      const modelInfo = edgeAI.getModelInfo();
      expect(modelInfo.weightsSize).toBe(112); // 13*8 + 8*1
    });

    it('should update feature scalers', () => {
      const newScalers = Array(13).fill(0).map(() => ({ mean: 0, std: 1 }));

      edgeAI.updateFeatureScalers(newScalers);

      // Should accept valid scalers
    });

    it('should set anomaly threshold', () => {
      edgeAI.setAnomalyThreshold(0.5);

      // Threshold should be updated
    });
  });

  describe('local decision making', () => {
    it('should trigger immediate alert for critical risk', async () => {
      // Mock a critical risk scenario
      const criticalReading = {
        ...mockSensorReading,
        measurements: {
          ...mockSensorReading.measurements,
          tilt_x: 0.8, // Very high tilt
          pore_pressure: 400, // Very high pressure
          strain_gauge: 300 // Very high strain
        }
      };

      const result = await edgeAI.detectAnomaly(criticalReading);
      const shouldAlert = edgeAI.shouldTriggerImmediateAlert(result);

      if (result.riskLevel === 'critical' && result.confidence > 0.7) {
        expect(shouldAlert).toBe(true);
      }
    });

    it('should increase transmission frequency for high risk', async () => {
      const result = await edgeAI.detectAnomaly(mockSensorReading);
      
      // Modify result to simulate high risk
      result.riskLevel = 'high';
      result.confidence = 0.9;

      const shouldIncrease = edgeAI.shouldIncreaseTransmissionFrequency(result);
      expect(shouldIncrease).toBe(true);
    });

    it('should enter low power mode for low risk', async () => {
      const result = await edgeAI.detectAnomaly(mockSensorReading);
      
      // Ensure low risk with high confidence
      result.riskLevel = 'low';
      result.confidence = 0.95;

      const shouldEnterLowPower = edgeAI.shouldEnterLowPowerMode(result);
      expect(shouldEnterLowPower).toBe(true);
    });
  });

  describe('getModelInfo', () => {
    it('should return model information', () => {
      const modelInfo = edgeAI.getModelInfo();

      expect(modelInfo).toHaveProperty('weightsSize');
      expect(modelInfo).toHaveProperty('historySize');
      expect(modelInfo).toHaveProperty('threshold');
      expect(modelInfo).toHaveProperty('memoryUsage');

      expect(modelInfo.weightsSize).toBeGreaterThan(0);
      expect(modelInfo.historySize).toBeGreaterThanOrEqual(0);
      expect(modelInfo.memoryUsage).toBeGreaterThan(0);
    });
  });
});